# voice.wav + sfx.json + music plan -> mix.wav
import json, sys, subprocess, numpy as np, scipy.io.wavfile as wf
from scipy.signal import butter, sosfilt
D = sys.argv[1]; SR = 48000
rng = np.random.default_rng(7)
def env(n, a=.005, r=None):
    t = np.arange(n)/SR; e = np.minimum(1, t/a)
    return e*np.exp(-t/(r or n/SR/4))
def tone(f, d, r=None, a=.003):
    t = np.arange(int(d*SR))/SR; return np.sin(2*np.pi*f*t)*env(len(t), a, r)
def noise(d): return rng.standard_normal(int(d*SR))
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f): return sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
def add(*xs):
    n = max(len(x) for x in xs); o = np.zeros(n)
    for x in xs: o[:len(x)] += x
    return o
def sweep(f0, f1, d, r=None):
    t = np.arange(int(d*SR))/SR; f = np.geomspace(f0, f1, len(t)); ph = 2*np.pi*np.cumsum(f)/SR
    return np.sin(ph)*env(len(t), .005, r)
def whoosh(d=.35, lo=300, hi=3000):
    n = noise(d); t = np.linspace(0, 1, len(n)); e = np.sin(np.pi*t)**2
    a = bp(n, lo, hi)*e; return a/np.abs(a).max()*.7
S = {}
S['whoosh'] = whoosh(.3, 500, 4000)
S['whoosh_big'] = whoosh(.55, 200, 2500)
S['pop'] = sweep(500, 1300, .09, .03)*.8
S['tick'] = bp(noise(.03), 2000, 6000)*env(int(.03*SR), .001, .006)*1.5
S['ding'] = add(tone(1318, 1.0, .3), .5*tone(2637, .8, .15))*.5
S['tin'] = add(tone(1760, .5, .12), .6*tone(2637, .4, .08))*.5
S['blip'] = tone(1046, .12, .04)*.6
S['success'] = np.concatenate([tone(784, .1, .05), tone(1046, .1, .05), tone(1568, .5, .15)])*.5
S['stamp'] = add(lp(noise(.25), 900)*env(int(.25*SR), .002, .05)*2, tone(70, .3, .08)*.8)
S['thud'] = add(tone(55, .6, .18), lp(noise(.2), 300)*env(int(.2*SR), .002, .04))
S['impact'] = add(tone(45, 1.4, .4), lp(noise(.6), 1500)*env(int(.6*SR), .002, .12)*.8)
S['chair'] = bp(noise(.45), 400, 1400)*np.abs(np.sin(np.linspace(0, 40, int(.45*SR))))*env(int(.45*SR), .02, .2)*1.4
S['flip'] = np.concatenate([bp(noise(.05), 1500, 6000)*env(int(.05*SR), .001, .01) for _ in range(7)] + [np.zeros(1)])
fl = np.zeros(int(.75*SR)); 
for i in range(7): x = bp(noise(.05), 1500, 6000)*env(int(.05*SR), .001, .012); o = int(i*.1*SR); fl[o:o+len(x)] += x
S['flip'] = fl
S['boing'] = sweep(180, 520, .3, .15)*.6
S['riser'] = (whoosh(2.2, 300, 5000)*np.linspace(0, 1, int(2.2*SR)) + sweep(200, 900, 2.2, 5)*.25)
S['riser_short'] = whoosh(1.0, 400, 5000)*np.linspace(.2, 1, int(1.0*SR))*.6
S['shimmer'] = sum(tone(f, 1.2, .5) for f in [1568, 1976, 2349, 3136])*.25
h = np.zeros(int(1.0*SR))
for o in [0, .28]: x = tone(60, .25, .06); h[int(o*SR):int(o*SR)+len(x)] += x
S['heart'] = h*1.2
b = np.zeros(int(.7*SR))
for i in range(3): x = (np.sign(np.sin(2*np.pi*150*np.arange(int(.15*SR))/SR))*.3)*env(int(.15*SR), .005, .1); b[int(i*.22*SR):int(i*.22*SR)+len(x)] += lp(x, 900)
S['buzz'] = b
S['logo'] = sum(tone(f, 1.8, .7, .02) for f in [523, 659, 784, 1046])*.3
# crowd murmur bed (chaos terrace), 11 s
c = bp(noise(11), 250, 1800); m = lp(np.abs(noise(11)), 3); c = c*(0.6+m/m.max()); c *= np.minimum(1, np.arange(len(c))/SR/.5)
c[-int(SR*.8):] *= np.linspace(1, 0, int(SR*.8)); S['crowd'] = c/np.abs(c).max()*.25

sr, v = wf.read(f"{D}/voice.wav"); v = v.astype(np.float32)
N = len(v); fx = np.zeros(N, np.float32)
for t, n, vol in json.load(open(f"{D}/sfx.json")):
    x = S[n]*vol*.55; o = int(t*SR); e = min(N, o+len(x)); fx[o:e] += x[:e-o]
# music
tl = json.load(open(f"{D}/tl.json")); L = {l['id']: l for l in tl['lines']}
def load(name, off, dur):
    pcm = subprocess.run(["ffmpeg","-v","error","-ss",str(off),"-t",str(dur),"-i",f"{D}/music/{name}.mp3","-f","f32le","-ac","1","-ar",str(SR),"pipe:1"],capture_output=True).stdout
    return np.frombuffer(pcm, np.float32).copy()
mus = np.zeros(N, np.float32)
def place(name, t0, t1, off, g, fin=.05, fout=.3):
    x = load(name, off, t1-t0)
    x *= g; a = int(fin*SR); b = int(fout*SR)
    x[:a] *= np.linspace(0, 1, a); x[-b:] *= np.linspace(1, 0, b)
    o = int(t0*SR); e = min(N, o+len(x)); mus[o:e] += x[:e-o]
cut = L['s5']['s'] + .05
place("Monkeys Spinning Monkeys", 0, cut, 4.0, 1.0, .02, .25)
place("Bossa Antigua", L['s7']['s'] - .15, N/SR, 0.0, 1.0, .05, 1.8)
# ducking under voice
env_v = np.convolve(np.abs(v), np.ones(int(.08*SR))/int(.08*SR), 'same')
duck = np.where(env_v > .02, .55, 1.0).astype(np.float32); duck = np.convolve(duck, np.ones(int(.15*SR))/int(.15*SR), 'same')
def rms(x): x = x[np.abs(x) > 1e-4]; return np.sqrt(np.mean(x**2)) if len(x) else 1
vr = rms(v); mr = rms(mus)
mus *= (vr*10**(-10/20))/mr  # music ~10 dB below voice before duck
mix = v + mus*duck + fx
mix = np.tanh(mix/ (np.abs(mix).max()*.9) * 1.1)*.9
wf.write(f"{D}/mix.wav", SR, mix.astype(np.float32))
print("ok", N/SR, "voice rms dB", 20*np.log10(vr), "music rms dB", 20*np.log10(rms(mus)))
