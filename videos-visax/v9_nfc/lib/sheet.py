import sys,glob
from PIL import Image
d=sys.argv[1]; fs=sorted(glob.glob(d+'/t*.jpg'),key=lambda f:float(f.split('/t')[-1][:-4]))
ims=[Image.open(f).resize((270,480)) for f in fs]; c=int(sys.argv[3]) if len(sys.argv)>3 else 8
W=Image.new('RGB',(270*c,480*((len(ims)+c-1)//c)))
for i,im in enumerate(ims): W.paste(im,((i%c)*270,(i//c)*480))
W.save(sys.argv[2],quality=85)
