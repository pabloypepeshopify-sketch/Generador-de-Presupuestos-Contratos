"""Sintetizador mínimo (solo numpy) para componer música de fondo a medida de cada vídeo, sincronizada con sus momentos.
Uso: python sinte.py <tema> <salida.mp3>   (temas: thriller, intenso)"""
import numpy as np, subprocess, sys, wave
SR = 44100
rng = np.random.default_rng(7)

def lp(x, fc):  # paso bajo de un polo (fc puede ser array)
    fc = np.broadcast_to(np.asarray(fc, float), x.shape); a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); z = 0.0
    for i in range(len(x)): z = (1 - a[i]) * x[i] + a[i] * z; y[i] = z
    return y
def hp(x, fc): return x - lp(x, fc)
def env(n, at=0.005, dec=0.3, sus=0.0, rel=0.05):
    t = np.arange(n) / SR; e = np.minimum(1, t / max(at, 1e-4)) * (sus + (1 - sus) * np.exp(-t / dec)); r = int(rel * SR)
    if r and n > r: e[-r:] *= np.linspace(1, 0, r)
    return e
def saw(f, n, fase=0): t = np.arange(n) / SR; return 2 * ((t * f + fase) % 1) - 1
def sq(f, n): t = np.arange(n) / SR; return np.sign(np.sin(2 * np.pi * f * t))
def sine(f, n): t = np.arange(n) / SR; return np.sin(2 * np.pi * f * t)
def nota(m): return 440 * 2 ** ((m - 69) / 12)
class Pista:
    def __init__(s, dur): s.x = np.zeros(int(dur * SR) + SR)
    def pon(s, t, y, g=1.0):
        i = int(t * SR); 
        if i >= len(s.x) or i < 0: return
        y = y[:len(s.x) - i]; s.x[i:i + len(y)] += g * y
def kick(g=1.0): n = int(0.45 * SR); t = np.arange(n) / SR; f = 45 + 110 * np.exp(-t * 28); ph = 2 * np.pi * np.cumsum(f) / SR; return g * np.sin(ph) * np.exp(-t * 7)
def clap(): n = int(0.25 * SR); x = rng.standard_normal(n); x = hp(lp(x, 4000), 900); return 0.5 * x * env(n, 0.002, 0.08)
def hat(abierto=False): n = int((0.25 if abierto else 0.06) * SR); x = hp(rng.standard_normal(n), 7000); return 0.22 * x * env(n, 0.001, 0.09 if abierto else 0.02)
def tom(f=110): n = int(0.4 * SR); t = np.arange(n) / SR; ph = 2 * np.pi * np.cumsum(f * (1 + 0.6 * np.exp(-t * 20))) / SR; return 0.6 * np.sin(ph) * np.exp(-t * 9)
def bajo(m, d, corte=600): n = int(d * SR); x = saw(nota(m), n) + 0.6 * saw(nota(m) * 1.005, n); return 0.35 * lp(x * env(n, 0.004, d * 0.8, 0.4, 0.03), corte)
def pluck(m, d=0.25, corte=3000): n = int(d * SR); x = 0.6 * sq(nota(m), n) + 0.4 * saw(nota(m) * 2, n); return 0.18 * lp(x * env(n, 0.002, 0.08, 0, 0.02), corte)
def pad(ms, d, corte=1200, at=0.4):
    n = int(d * SR); x = sum(saw(nota(m) * k, n, fase=rng.random()) for m in ms for k in (0.997, 1.003)); return 0.06 * lp(x * env(n, at, 99, 1, min(0.4, d / 3)), corte)
def riser(d, g=0.3): n = int(d * SR); t = np.arange(n) / SR; x = rng.standard_normal(n); return g * hp(x, 300 + 6000 * (t / d) ** 2) * (t / d) ** 2
def cuerdas(m, d, g=0.07, corte=2500): n = int(d * SR); t = np.arange(n) / SR; vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t); ph = np.cumsum(nota(m) * vib) / SR; x = 2 * (ph % 1) - 1 + 2 * ((ph * 1.004) % 1) - 1; return g * lp(x * env(n, 0.05, 99, 1, 0.05), corte)

def thriller():  # «MARTES, 23:58»: suspense → acción → frenazo → triunfo → cómico
    D = 16.8; P = Pista(D); aterriza, sera, tu, diez, postre = 10.55, 7.3, 2.95, 13.0, 14.45
    dr = sine(55, int(aterriza * SR)) * 0.25 + sine(82.4, int(aterriza * SR)) * 0.08; dr *= np.minimum(1, np.arange(len(dr)) / SR / 1.5); P.pon(0, dr)
    for b in np.arange(0.0, sera, 1.0): P.pon(b, kick(0.7)); P.pon(b + 0.22, kick(0.45))          # latido
    for i, b in enumerate(np.arange(tu, sera, 0.25)): P.pon(b, bajo([45, 45, 48, 45, 50, 45, 48, 44][i % 8], 0.22, 500))  # ostinato
    P.pon(tu, cuerdas(57, sera - tu, 0.05)); P.pon(tu, cuerdas(60, sera - tu, 0.04)); P.pon(tu + 2, cuerdas(64, sera - tu - 2, 0.035))
    for i, b in enumerate(np.arange(sera, aterriza - 0.05, 0.125)):                              # acción
        P.pon(b, bajo([45, 45, 57, 45, 48, 45, 60, 47][i % 8], 0.11, 900)); 
        if i % 4 == 0: P.pon(b, kick(0.9))
        if i % 4 == 2: P.pon(b, clap(), 0.8)
        P.pon(b, hat(), 0.8)
        if i % 8 == 6: P.pon(b, tom(130)); P.pon(b + 0.06, tom(100))
    for k, m in enumerate([69, 72, 76, 74]): P.pon(sera + k * 0.8, cuerdas(m, 0.75, 0.06, 4000))
    P.pon(aterriza - 2.2, riser(2.2, 0.35))
    P.pon(aterriza + 0.3, sine(41, int(2.0 * SR)) * 0.2 * env(int(2.0 * SR), 0.3, 99, 1, 0.8))   # silencio tenso tras el aterrizaje
    for m in (60, 64, 67, 72): P.pon(diez - 0.05, pad([m], 1.4, 3000, 0.08), 1.6)                 # «Un diez»: acorde mayor
    for i, (b, m) in enumerate(zip(np.arange(postre - 0.1, D, 0.2), [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84])):  # pizzicato cómico
        P.pon(b, pluck(m, 0.18, 4500), 1.2); 
        if i % 2 == 0: P.pon(b, pluck(m - 24, 0.18, 1200), 1.4)
    return P.x

def intenso(cues):  # «¿Cuántos km…?»: subida, beat 128, doble tiempo, rebobinado (cinta), groove mayor, drop final
    D = cues['fin'] + 0.5; P = Pista(D); bpm = 128; b = 60 / bpm; A = cues['abrimos']
    def compas(t0, t1, prog, intens=1.0, lento=False):
        for i, t in enumerate(np.arange(t0, t1, b / 2)):
            k = i // 2; acorde = prog[(k // 4) % len(prog)]
            if i % 2 == 0 and (not lento or k % 2 == 0): P.pon(t, kick(0.95))
            if i % 2 == 1: P.pon(t, hat(True), 0.7 * intens)
            P.pon(t, hat(), 0.5 * intens); P.pon(t + b / 4, hat(), 0.35 * intens)
            if i % 4 == 2: P.pon(t, clap(), 0.9)
            if i % 2 == 1: P.pon(t, bajo(acorde[0] - 12, b / 2 * 0.9, 700))
            P.pon(t, pluck(acorde[(i % 3) + 1] + 12, 0.2, 3500), 0.9 * intens); P.pon(t + b / 4, pluck(acorde[((i + 1) % 3) + 1] + 12, 0.15, 3000), 0.6 * intens)
    menor = [[45, 57, 60, 64], [41, 53, 57, 60], [48, 55, 60, 64], [43, 55, 59, 62]]; mayor = [[48, 60, 64, 67], [43, 55, 59, 62], [45, 57, 60, 64], [41, 53, 57, 60]]
    for t in np.arange(0, A, b / 2): P.pon(t, hat(), 0.4)                                            # intro filtrada
    P.pon(0, pad([57, 60, 64], A, 700, 0.6)); P.pon(A - 1.6, riser(1.6, 0.4))
    for k, t in enumerate(np.arange(A - b * 2, A, b / 4)): P.pon(t, clap(), 0.3 + k * 0.08)
    compas(A, cues['diez'], menor)
    for i, t in enumerate(np.arange(cues['diez'], cues['quince'], b / 4)):                           # doble tiempo
        P.pon(t, hat(), 0.6); 
        if i % 2 == 0: P.pon(t, kick(1.0)); P.pon(t, bajo(45 + (i // 4) % 4 * 2, b / 4, 1200))
        if i % 4 == 2: P.pon(t, clap(), 0.9)
        P.pon(t, pluck(69 + (i % 8), 0.12, 5000), 0.9)
    P.pon(cues['quince'] - 1.0, riser(1.0, 0.4)); P.pon(cues['quince'], kick(1.2)); P.pon(cues['quince'], pad([45, 52, 57, 60], cues['rebobina'] - cues['quince'], 2500, 0.01), 1.4)
    # rebobinado: lo anterior al revés, frenando como una cinta
    r0, r1 = cues['rebobina'], cues['finReb']; src = P.x[int(A * SR):int(cues['quince'] * SR)][::-1]; n = int((r1 - r0) * SR)
    vel = np.linspace(3.0, 0.15, n); idx = np.cumsum(vel).astype(int); idx = idx[idx < len(src)]; P.pon(r0, 0.6 * src[idx] * np.linspace(1, 0, len(idx)))
    compas(r1, cues['hasta'], mayor, 0.8, lento=True); P.pon(cues['hasta'] - 1.2, riser(1.2, 0.4))
    compas(cues['hasta'], D, mayor, 1.1); P.pon(cues['hasta'], pad([60, 64, 67, 72], D - cues['hasta'], 3500, 0.02), 1.3)
    return P.x

def tictac(cues):  # «¿Cuánto tiempo esperas al camarero?»: tic-tac que se acelera con los años, golpe, y silencio cuando se para el reloj
    D = cues['fin'] + 0.5; P = Pista(D); tres, cin2, y, para = cues['tres'], cues['cin2'], cues['y'], cues['para']
    def tic(alto): n = int(0.05 * SR); return (0.45 if alto else 0.3) * sine(2400 if alto else 1800, n) * env(n, 0.001, 0.012)
    k = 0
    for t in np.arange(0, tres, 0.25): P.pon(t, tic(k % 2 == 0)); k += 1                        # tic-tac (8.º de 120)
    for i, t in enumerate(np.arange(0, tres, 0.5)):                                            # pulso: bombo + bajo
        P.pon(t, kick(0.8)); P.pon(t + 0.25, bajo([45, 45, 48, 43][(i // 2) % 4], 0.22, 500))
    P.pon(0, pad([57, 60, 64], tres, 900, 0.3))
    t = tres; vel = 4.0; k = 0                                                                  # los años: cada vez más rápido
    while t < cin2: P.pon(t, tic(k % 2 == 0)); k += 1; q = (t - tres) / (cin2 - tres); vel = 4 + 28 * q * q; t += 1 / vel
    for i, t in enumerate(np.arange(tres, cin2, 0.125)):
        if i % 2 == 0: P.pon(t, kick(0.9))
        P.pon(t, bajo([45, 57, 48, 60, 43, 55, 47, 59][i % 8], 0.11, 900)); P.pon(t, pluck(69 + (i * 5) % 12, 0.12, 4000), 0.6)
    P.pon(cin2 - 1.2, riser(1.2, 0.45)); P.pon(cin2, kick(1.3))
    P.pon(cin2, pad([45, 52, 57], y - cin2, 1500, 0.02), 1.2)                                   # 54 días: grave y pesado
    for i, t in enumerate(np.arange(y, para - 0.05, 0.15)): P.pon(t, pluck([72, 76, 79, 84][i % 4], 0.14, 5000), 0.9)  # la tarjeta: brillo ascendente
    P.pon(para + 0.7, pad([60, 64, 67, 72], D - para - 0.7, 3000, 0.05), 1.3)                  # silencio al pararse el reloj y acorde final
    for i, t in enumerate(np.arange(para + 0.7, D, 0.25)): P.pon(t, pluck([72, 76, 79, 76][i % 4], 0.2, 3500), 0.7)
    return P.x

def silbido(m, d, g=0.16):  # silbido del Oeste: seno con vibrato y algo de aire
    n = int(d * SR); t = np.arange(n) / SR; f = nota(m) * (1 + 0.012 * np.sin(2 * np.pi * 5.8 * t) * np.minimum(1, t / 0.25)); ph = 2 * np.pi * np.cumsum(f) / SR
    return g * (np.sin(ph) + 0.05 * hp(rng.standard_normal(n), 3000)) * env(n, 0.04, 99, 1, 0.08)
def guitarra(m, d=0.6, g=0.22): n = int(d * SR); x = saw(nota(m), n) * 0.6 + sq(nota(m) * 2, n) * 0.2; return g * lp(x * env(n, 0.002, 0.25, 0, 0.05), 2200)
def oeste(cues):  # «EL ÚLTIMO CROISSANT»: duelo → silencio congelado → cajita de música → pelea cómica → vals final
    D = cues['fin'] + 0.5; P = Pista(D); reb, duelo, salto, freeze, choque, sen = cues['reb'], cues['duelo'], cues['salto'], cues['freeze'], cues['choque'], cues['sen']
    P.pon(0, pad([45, 52, 57, 64], reb, 2500, 0.01), 1.4); P.pon(0, silbido(81, reb - 0.1, 0.2))
    for i, t in enumerate(np.arange(0, reb, 0.09)): P.pon(t, guitarra([45, 52, 57, 52][i % 4], 0.2, 0.15))
    src = P.x[:int(reb * SR)][::-1].copy(); n = int((duelo - reb) * SR); idx = np.cumsum(np.linspace(2.5, 0.3, n)).astype(int); idx = idx[idx < len(src)]; P.pon(reb, 0.7 * src[idx])
    mel = [(76, 0.45), (81, 0.45), (76, 0.45), (81, 0.3), (76, 1.2), (72, 0.3), (74, 0.3), (69, 1.0)]; t = duelo + 0.1
    for m, d in mel:
        if t > salto - 0.2: break
        P.pon(t, silbido(m, d * 0.95)); t += d
    for i, t in enumerate(np.arange(duelo, salto, 0.5)): P.pon(t, guitarra([40, 45][i % 2], 0.5, 0.25)); P.pon(t + 0.25, clap(), 0.25)
    P.pon(duelo, pad([40, 47, 52], salto - duelo, 700, 0.5), 1.2)
    for i, t in enumerate(np.arange(salto - 0.3, freeze, 0.06)): P.pon(t, guitarra([52, 57, 64, 69][i % 4], 0.12, 0.12 + 0.1 * (t - salto + 0.3)))
    P.pon(salto - 0.6, riser(0.6 + (freeze - salto), 0.35))
    for i, t in enumerate(np.arange(freeze + 0.25, choque - 0.05, 0.22)): P.pon(t, pluck([84, 88, 91, 88, 86, 89, 93, 89][i % 8], 0.3, 6000), 0.8)  # cajita de música
    P.pon(choque + 0.15, kick(1.3))
    for i, t in enumerate(np.arange(choque + 0.25, sen - 0.15, 0.18)):                        # pelea cómica (um-pa)
        P.pon(t, bajo([45, 45, 52, 52][i % 4] if i % 2 == 0 else 57, 0.14, 900)); 
        if i % 2: P.pon(t, clap(), 0.4)
        if i % 4 == 0: P.pon(t, silbido(81 + (i // 4) % 3 * 2, 0.15, 0.12))
    for i, t in enumerate(np.arange(sen, D, 0.3)):                                             # vals final
        P.pon(t, pluck([60, 67, 64, 60, 65, 69, 65, 60][i % 8] + (12 if i % 3 else 0), 0.35, 3000), 0.8 if i % 3 == 0 else 0.5)
    P.pon(sen, pad([60, 64, 67], D - sen, 2000, 0.3), 0.9)
    return P.x

def terror(cues):  # «03:33»: zumbido, latido que se acelera, golpes con los avisos, silencio con la luz, final cómico
    D = cues['fin'] + 0.5; P = Pista(D); luz, con = cues['luz'], cues['con']
    n = int(luz * SR); t = np.arange(n) / SR; dr = 0.22 * (np.sin(2 * np.pi * 41 * t) + 0.5 * np.sin(2 * np.pi * 43.5 * t)) * np.minimum(1, t / 1.0); P.pon(0, dr)
    P.pon(0, cuerdas(80, luz, 0.025, 6000)); P.pon(2.0, cuerdas(81, luz - 2.0, 0.02, 6000))           # cuerdas agudas disonantes
    tt = 0.3
    while tt < luz - 0.05: P.pon(tt, kick(0.75)); P.pon(tt + 0.18, kick(0.45)); q = tt / luz; tt += 1.0 - 0.6 * q   # latido que se acelera
    P.pon(luz - 1.5, riser(1.5, 0.45))
    for i, t0 in enumerate(np.arange(con, D, 0.22)): P.pon(t0, pluck([67, 64, 60, 64, 67, 72][i % 6], 0.18, 3500), 0.9 if i % 2 == 0 else 0.6)  # cómico
    P.pon(con, bajo(36, 0.3, 500)); P.pon(con + 0.44, bajo(43, 0.3, 500))
    return P.x

def acordeon(ms, d, g=0.05): n = int(d * SR); t = np.arange(n) / SR; x = sum(sq(nota(m), n) * (1 + 0.3 * np.sin(2 * np.pi * 6 * t)) for m in ms); return g * lp(x * env(n, 0.02, 99, 1, 0.03), 2500)
def carrera(cues):  # «países»: ritmo de carrera con un toque de cada país, frenazo en España y subidón final
    D = cues['fin'] + 0.5; P = Pista(D); b = 0.25; it, jp, us, fr, es, ahora, pero, treinta = (cues[k] for k in ('it', 'jp', 'us', 'fr', 'es', 'ahora', 'pero', 'treinta'))
    for i, t in enumerate(np.arange(0, ahora, b)):                                               # base de carrera
        if i % 2 == 0: P.pon(t, kick(0.85))
        P.pon(t, hat(), 0.5); 
        if i % 4 == 2: P.pon(t, clap(), 0.6)
    for t in np.arange(0, it, 0.125): P.pon(t, pluck(76, 0.1, 5000), 0.5)                          # gancho: tic-tac agudo
    P.pon(it - 0.6, riser(0.6, 0.35))
    for i, t in enumerate(np.arange(it, jp, 0.0625)): P.pon(t, pluck([76, 79, 84, 79][(i // 2) % 4], 0.07, 6000), 0.7)        # Italia: mandolina (trémolo)
    for i, t in enumerate(np.arange(jp, us, 0.25)): P.pon(t, pluck([69, 71, 74, 76, 79, 76, 74, 71][i % 8], 0.35, 3500), 1.0)  # Japón: pentatónica
    for i, t in enumerate(np.arange(us, fr, 0.25)): P.pon(t, 0.6 * np.tanh(4 * guitarra([40, 40, 43, 45][(i // 2) % 4], 0.24, 0.5)))  # EE. UU.: rock
    for i, t in enumerate(np.arange(fr, es, 0.5)): P.pon(t, acordeon([[57, 61, 64], [55, 59, 62]][i % 2], 0.48))              # Francia: acordeón
    for i, t in enumerate(np.arange(es, ahora, 0.125)): P.pon(t, guitarra([52, 56, 59, 64][i % 4], 0.12, 0.2)); P.pon(t, clap(), 0.25 if i % 2 else 0)  # España: rasgueo y palmas
    src = P.x[int((ahora - 1.0) * SR):int(ahora * SR)].copy(); n = int(0.6 * SR); idx = np.cumsum(np.linspace(1.0, 0.05, n)).astype(int); idx = idx[idx < len(src)]; P.pon(ahora, 0.8 * src[idx])  # frenazo de cinta
    P.pon(pero - 0.2, riser(treinta - pero + 0.2, 0.35))
    for i, t in enumerate(np.arange(treinta, D, 0.125)):                                          # subidón final
        if i % 4 == 0: P.pon(t, kick(1.0))
        if i % 8 == 4: P.pon(t, clap(), 0.8)
        P.pon(t, hat(), 0.5); P.pon(t, guitarra([52, 56, 59, 64, 68, 64, 59, 56][i % 8], 0.12, 0.18))
    P.pon(treinta, pad([52, 56, 59, 64], D - treinta, 3000, 0.02), 1.3)
    return P.x

def caoscalma(cues):  # «antes y después»: caos acelerado y disonante → frenazo → groove tranquilo y alegre
    D = cues['fin'] + 0.5; P = Pista(D); hasta, calma = cues['hasta'], cues['calma']
    for i, t in enumerate(np.arange(0, hasta, 0.1)):
        if i % 2 == 0: P.pon(t, kick(0.8))
        P.pon(t, hat(), 0.6); P.pon(t, bajo([45, 46, 45, 51][(i // 4) % 4], 0.09, 1200), 0.8)
        if i % 3 == 0: P.pon(t, pluck(69 + (i * 7) % 13, 0.08, 6000), 0.5)
    P.pon(0, pad([57, 58, 63], hasta, 1500, 0.2), 1.1)
    src = P.x[int((hasta - 0.8) * SR):int(hasta * SR)].copy(); n = int(0.5 * SR); idx = np.cumsum(np.linspace(1.0, 0.05, n)).astype(int); idx = idx[idx < len(src)]; P.pon(hasta, 0.8 * src[idx])
    for i, t in enumerate(np.arange(hasta + 0.35, calma, 0.22)): P.pon(t, pluck([72, 76, 79, 84, 79, 76, 72, 67][i % 8], 0.2, 5000), 0.9)   # tarjetas: tac tac
    mayor = [[48, 60, 64, 67], [45, 57, 60, 64], [41, 53, 57, 60], [43, 55, 59, 62]]
    for i, t in enumerate(np.arange(calma, D, 0.25)):
        a = mayor[(i // 8) % 4]
        if i % 4 == 0: P.pon(t, kick(0.7))
        if i % 4 == 2: P.pon(t, clap(), 0.5)
        P.pon(t, hat(), 0.35); 
        if i % 2 == 1: P.pon(t, bajo(a[0] - 12, 0.22, 700))
        P.pon(t, pluck(a[1 + i % 3] + 12, 0.25, 3500), 0.7)
    P.pon(calma, pad([60, 64, 67], D - calma, 2500, 0.3), 1.0)
    return P.x

def guarda(x, dst):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.9; d = int(0.011 * SR); L = x; R = np.concatenate([np.zeros(d), x[:-d]]) * 0.92 + x * 0.08
    pcm = (np.stack([L, R], 1) * 32767).astype(np.int16); tmp = dst + '.wav'
    with wave.open(tmp, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', 'acompressor=threshold=0.25:ratio=3,loudnorm=I=-16', '-ar', '44100', '-b:a', '192k', dst], check=True); import os; os.remove(tmp)

if __name__ == '__main__':
    tema, dst = sys.argv[1], sys.argv[2]
    if tema == 'thriller': guarda(thriller(), dst)
    else:
        import json; q = json.loads(sys.argv[3]); guarda({'tictac': tictac, 'oeste': oeste, 'terror': terror, 'carrera': carrera, 'caoscalma': caoscalma}.get(tema, intenso)(q), dst)
