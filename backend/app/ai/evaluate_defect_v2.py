from __future__ import annotations
import json
from pathlib import Path
import torch
from torch.utils.data import DataLoader
from app.ai.train_defect_v2 import (
    CATEGORIES, DEFECT_CLASSES, GLOBAL_CLASS_NAMES,
    GLOBAL_CLASS_TO_INDEX, INDEX_TO_CATEGORY,
    DefectCNNV2, DefectDataset, collect_samples,
    split_samples, DEVICE, BATCH_SIZE,
)

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / 'saved_models' / 'defect_models' / 'shared_category_aware_defect_model_v2.pth'
REPORT_PATH = BASE_DIR / 'evaluation' / 'reports' / 'defect_v2_controlled_validation.json'


def div(a,b): return a/b if b else 0.0

def metrics(y_true,y_pred,labels):
    labels=list(labels); n=len(y_true); correct=sum(a==b for a,b in zip(y_true,y_pred))
    ps=[]; rs=[]; fs=[]; per={}
    for lab in labels:
        tp=sum(t==lab and p==lab for t,p in zip(y_true,y_pred))
        fp=sum(t!=lab and p==lab for t,p in zip(y_true,y_pred))
        fn=sum(t==lab and p!=lab for t,p in zip(y_true,y_pred))
        p=div(tp,tp+fp); r=div(tp,tp+fn); f=div(2*p*r,p+r)
        ps.append(p); rs.append(r); fs.append(f)
        per[str(lab)]={'precision':p,'recall':r,'f1':f,'support':sum(t==lab for t in y_true)}
    return {'accuracy':div(correct,n),'precision_macro':div(sum(ps),len(ps)),'recall_macro':div(sum(rs),len(rs)),'f1_macro':div(sum(fs),len(fs)),'total':n,'correct':correct,'per_class':per}

def matrix(y_true,y_pred,labels):
    labels=list(labels); idx={x:i for i,x in enumerate(labels)}; m=[[0]*len(labels) for _ in labels]
    for t,p in zip(y_true,y_pred):
        if t in idx and p in idx: m[idx[t]][idx[p]]+=1
    return m

@torch.no_grad()
def main():
    print('\n'+'='*72); print('VISIONINSPECT AI - CONTROLLED V2 VALIDATION'); print('='*72)
    if not MODEL_PATH.exists(): raise FileNotFoundError(f'Checkpoint not found: {MODEL_PATH}')
    samples=collect_samples(); train_samples,val_samples=split_samples(samples)
    print(f'Total defective : {len(samples)}'); print(f'Training split   : {len(train_samples)}'); print(f'Validation split : {len(val_samples)}'); print('Official test    : NOT USED')
    loader=DataLoader(DefectDataset(val_samples,training=False),batch_size=BATCH_SIZE,shuffle=False,num_workers=0)
    ckpt=torch.load(MODEL_PATH,map_location=DEVICE,weights_only=False)
    model=DefectCNNV2().to(DEVICE); model.load_state_dict(ckpt['model_state_dict'],strict=True); model.eval()
    print('Checkpoint load : PASS')
    ct=[]; cp=[]; gt=[]; ep=[]; op=[]
    for full,detail,cats,glabs in loader:
        full=full.to(DEVICE); detail=detail.to(DEVICE); cats=cats.to(DEVICE); glabs=glabs.to(DEVICE)
        features,clogits=model(full,detail); pc=clogits.argmax(1)
        for i in range(full.size(0)):
            tc=int(cats[i]); pc_i=int(pc[i]); tg=int(glabs[i]); ct.append(tc); cp.append(pc_i); gt.append(tg)
            tcname=INDEX_TO_CATEGORY[tc]
            local_true=GLOBAL_CLASS_NAMES[tg].split('::',1)[1]
            # Oracle: true category, predicted defect head.
            ologits=model.defect_heads[tcname](features[i:i+1]); oi=int(ologits.argmax(1)); od=DEFECT_CLASSES[tcname][oi]
            op.append(GLOBAL_CLASS_TO_INDEX[f'{tcname}::{od}'])
            # Exact: predicted category, predicted defect head.
            pcname=INDEX_TO_CATEGORY[pc_i]; elogits=model.defect_heads[pcname](features[i:i+1]); ei=int(elogits.argmax(1)); ed=DEFECT_CLASSES[pcname][ei]
            ep.append(GLOBAL_CLASS_TO_INDEX[f'{pcname}::{ed}'])
    cm=metrics(ct,cp,range(len(CATEGORIES))); om=metrics(gt,op,range(len(GLOBAL_CLASS_NAMES))); em=metrics(gt,ep,range(len(GLOBAL_CLASS_NAMES)))
    per_cat={}
    for ci,c in enumerate(CATEGORIES):
        tl=[]; pl=[]
        for i,tci in enumerate(ct):
            if tci!=ci: continue
            tl.append(DEFECT_CLASSES[c].index(GLOBAL_CLASS_NAMES[gt[i]].split('::',1)[1]))
            pl.append(DEFECT_CLASSES[c].index(GLOBAL_CLASS_NAMES[op[i]].split('::',1)[1]))
        mm=metrics(tl,pl,range(len(DEFECT_CLASSES[c]))); mm['labels']=DEFECT_CLASSES[c]; mm['confusion_matrix']=matrix(tl,pl,range(len(DEFECT_CLASSES[c]))); per_cat[c]=mm
    report={'evaluation_type':'controlled_v2_validation','official_test_used':False,'checkpoint':str(MODEL_PATH),'architecture':ckpt.get('architecture'),'image_size':ckpt.get('image_size'),'detail_crop_size':ckpt.get('detail_crop_size'),'detail_output_size':ckpt.get('detail_output_size'),'validation_samples':len(val_samples),'category_metrics':cm,'oracle_defect_metrics':om,'exact_end_to_end_metrics':em,'per_category_defect_metrics':per_cat,'oracle_confusion_matrix':matrix(gt,op,range(len(GLOBAL_CLASS_NAMES))),'exact_confusion_matrix':matrix(gt,ep,range(len(GLOBAL_CLASS_NAMES))),'global_class_names':GLOBAL_CLASS_NAMES}
    REPORT_PATH.parent.mkdir(parents=True,exist_ok=True); REPORT_PATH.write_text(json.dumps(report,indent=2),encoding='utf-8')
    for title,m in [('CATEGORY',cm),('DEFECT ORACLE',om),('END-TO-END',em)]:
        print('\n'+title); print(f"Accuracy  : {m['accuracy']*100:.2f}%"); print(f"Precision : {m['precision_macro']*100:.2f}%"); print(f"Recall    : {m['recall_macro']*100:.2f}%"); print(f"F1        : {m['f1_macro']*100:.2f}%")
    print(f'\nReport saved: {REPORT_PATH}')
    print('='*72); print('EVALUATION COMPLETE'); print('='*72)

if __name__=='__main__': main()