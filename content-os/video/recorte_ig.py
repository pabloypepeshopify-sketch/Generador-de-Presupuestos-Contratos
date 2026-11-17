import subprocess, sys
F='/usr/share/fonts/opentype/inter/Inter-Black.otf'
def corta(src, dst, segs, hook, cta, ycta=1330):
    n=len(segs); parts=[]; v=[]
    for i,(a,b) in enumerate(segs):
        d=b-a
        parts.append(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS[v{i}];[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d=0.06,afade=t=out:st={d-0.08:.3f}:d=0.08[a{i}]")
        v.append(f"[v{i}][a{i}]")
    total=sum(b-a for a,b in segs)
    def txt(t, y, t0, t1, size, box='0x0b1220@0.82'):
        lines=t.split('\n'); out=[]
        for k,l in enumerate(lines):
            out.append(f"drawtext=fontfile={F}:text='{l}':fontsize={size}:fontcolor=white:box=1:boxcolor={box}:boxborderw=26:x=(w-text_w)/2:y={y+k*int(size*1.45)}:enable='between(t,{t0},{t1})'")
        return ','.join(out)
    filt=';'.join(parts)+';'+''.join(v)+f"concat=n={n}:v=1:a=1[vc][ac];[vc]"+txt(hook,560,0,2.8,84)+','+txt(cta[0],ycta,cta[1],cta[2],56,'0x2b6cff@0.92')+"[vo]"
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',src,'-filter_complex',filt,'-map','[vo]','-map','[ac]','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',dst],check=True)
    print(dst, round(total,2))
corta('hotel.mp4','hotel_ig.mp4',[(0,14.35),(18.85,22.85),(25.55,31.65)],'ESTE HOTEL ESCONDE\nALGO EN CADA PLANTA',('¿Cuál usarías tú? Comenta',9.0,13.0),1210)
corta('pov.mp4','pov_ig.mp4',[(0.2,3.95),(4.35,7.45),(7.6,9.55),(10.05,17.95),(18.55,20.45),(33.05,34.7),(34.95,39.1)],'POV\\: LLEVAS 15 MIN\nCON LA MANO\nLEVANTADA',('Comenta MESA',11.0,15.0),1640)
