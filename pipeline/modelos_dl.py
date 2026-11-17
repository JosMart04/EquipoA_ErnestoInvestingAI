"""Siete arquitecturas PyTorch, validación temporal interna y entrenamiento CPU."""
import copy
import numpy as np
import torch
from torch import nn
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import StandardScaler
from .variables import filas

torch.set_num_threads(4)

class Ventanas(Dataset):
    def __init__(self,x,y,dias,clas):
        self.x=x; self.y=y; self.fs=filas(dias,x.shape[1]); self.clas=clas
    def __len__(self): return len(self.fs)
    def __getitem__(self,i):
        d,t=self.fs[i]
        target=np.array([self.y[d,t,-1]>0],dtype=np.float32) if self.clas else self.y[d,t]*10
        return torch.from_numpy(self.x[d-59:d+1,t].copy()),torch.from_numpy(target.copy())

class Red(nn.Module):
    def __init__(self,tipo,n,salidas):
        super().__init__(); self.tipo=tipo
        if tipo==0: self.cuerpo=nn.Sequential(nn.Flatten(),nn.Linear(20*n,64),nn.ReLU(),nn.Linear(64,32),nn.ReLU())
        elif tipo in [1,2,3,4]:
            cls={1:nn.RNN,2:nn.LSTM,3:nn.GRU,4:nn.LSTM}[tipo]
            self.cuerpo=cls(n,32,batch_first=True,bidirectional=tipo==4)
        elif tipo==5: self.cuerpo=nn.Sequential(nn.Conv1d(n,32,5,padding=2),nn.ReLU(),nn.Conv1d(32,32,5,padding=2),nn.ReLU(),nn.AdaptiveAvgPool1d(1))
        else:
            self.entrada=nn.Linear(n,32)
            self.posicion=nn.Parameter(torch.randn(1,60,32)*0.01)
            self.cuerpo=nn.TransformerEncoder(nn.TransformerEncoderLayer(32,4,dim_feedforward=64,dropout=0.1,batch_first=True),2,enable_nested_tensor=False)
        self.salida=nn.Linear(64 if tipo==4 else 32,salidas)
    def forward(self,x):
        if self.tipo==0: z=self.cuerpo(x[:,-20:])
        elif self.tipo in [1,2,3,4]:
            _,h=self.cuerpo(x); h=h[0] if isinstance(h,tuple) else h
            z=torch.cat([h[-2],h[-1]],dim=1) if self.tipo==4 else h[-1]
        elif self.tipo==5: z=self.cuerpo(x.transpose(1,2)).squeeze(-1)
        else: z=self.cuerpo(self.entrada(x)+self.posicion).mean(dim=1)
        return self.salida(z)

def escalar(x,dias):
    # Se ajusta exclusivamente en fechas de entrenamiento y sus ventanas pasadas.
    usado=np.unique(np.concatenate([np.arange(d-59,d+1) for d in dias]))
    scaler=StandardScaler().fit(x[usado].reshape(-1,x.shape[-1]))
    return scaler,scaler.transform(x.reshape(-1,x.shape[-1])).reshape(x.shape).astype(np.float32)

def fit(tipo,x,y,dias,clas,epochs,val=None):
    torch.manual_seed(2026); np.random.seed(2026)
    model=Red(tipo,x.shape[-1],1 if clas else 30)
    loader=DataLoader(Ventanas(x,y,dias,clas),batch_size=256,shuffle=True,generator=torch.Generator().manual_seed(2026))
    optim=torch.optim.Adam(model.parameters(),lr=1e-3)
    lossfn=nn.BCEWithLogitsLoss() if clas else nn.MSELoss()
    best=float('inf'); best_state=None; best_epoch=epochs; malas=0
    for epoch in range(epochs):
        model.train()
        for xx,yy in loader:
            optim.zero_grad(); loss=lossfn(model(xx),yy)
            if not torch.isfinite(loss): raise ValueError('DL loss no finita')
            loss.backward(); nn.utils.clip_grad_norm_(model.parameters(),5); optim.step()
        if val is not None:
            model.eval(); total=0; n=0
            with torch.no_grad():
                for xx,yy in DataLoader(Ventanas(x,y,val,clas),batch_size=256):
                    total+=float(lossfn(model(xx),yy))*len(xx); n+=len(xx)
            valor=total/n
            if valor<best:
                best=valor; best_state=copy.deepcopy(model.state_dict()); best_epoch=epoch+1; malas=0
            else: malas+=1
            if malas>=3: break
    if best_state is not None: model.load_state_dict(best_state)
    return model,best_epoch

def predecir(model,x,y,dias,clas):
    model.eval(); out=[]
    with torch.no_grad():
        for xx,_ in DataLoader(Ventanas(x,y,dias,clas),batch_size=256):
            z=model(xx); out.append((z.sigmoid().flatten() if clas else z/10).numpy())
    return np.concatenate(out)

def ajustar_dl(tipo,x,y,train,test,all_days,actual,clas,epochs,carpeta):
    val=train[-126:]; interno=train[train<val[0]-30]
    if interno[-1]+30>=val[0]: raise ValueError('Fuga en validación interna')
    scaler,z=escalar(x,interno)
    model,elegidas=fit(tipo,z,y,interno,clas,epochs,val)
    # Prueba externa intacta: no participa en escalado ni early stopping.
    ev=predecir(model,z,y,test,clas)
    scaler,z=escalar(x,all_days)
    final,_=fit(tipo,z,y,all_days,clas,elegidas)
    live=predecir(final,z,y,actual,clas)
    torch.save({'state_dict':final.state_dict(),'mean':scaler.mean_.tolist(),'scale':scaler.scale_.tolist(),'ultima_fecha_indice':int(all_days[-1]),'tipo':tipo,'clasificacion':clas},carpeta/f'pesos-{clas}-{tipo}.pt')
    return ev,live,{'epocas':elegidas,'max_epocas':epochs,'paciencia':3,'validacion_fechas':126,'embargo_validacion':30,'lote':256,'lr':0.001,'ventana':20 if tipo==0 else 60,'semilla':2026,'escala_objetivo_regresion':10}
