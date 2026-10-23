#!/usr/bin/env python3
"""Une partes: python3 unir.py salida.json parte1.json parte2.json ..."""
import json,sys,os
out=[]
for f in sys.argv[2:]: out+=json.load(open(f,encoding='utf-8'))
json.dump(out,open(sys.argv[1],'w',encoding='utf-8'),ensure_ascii=False,indent=0)
for f in sys.argv[2:]: os.remove(f)
print(len(out),"ítems en",sys.argv[1])
