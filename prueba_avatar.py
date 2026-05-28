import pygame
import speech_recognition as sr
import threading
import math
import sys
import random

# --- CONFIGURACIÓN E INICIALIZACIÓN ---
pygame.init()
SCREEN_WIDTH, SCREEN_HEIGHT = 800, 600
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Avatar Interactivo para Niños")
clock = pygame.time.Clock()

HISTORIA = ["Había una vez", "un pequeño robot", "que vivía en la luna", "¡Y le encantaba bailar!"]
indice_texto = 0

boca_estado = "cerrada"
hablando = False
contador_tiempo = 0
particulas = []  # Lista para guardar el "confeti"


# --- SISTEMA DE PARTÍCULAS (CONFETI) ---
def crear_confeti():
    for _ in range(30):
        particulas.append({
            "x": random.randint(300, 500),
            "y": random.randint(250, 350),
            "vx": random.uniform(-5, 5),
            "vy": random.uniform(-8, -2),
            "color": random.choice([(255, 105, 180), (255, 215, 0), (50, 205, 50), (0, 191, 255)]),
            "radio": random.randint(4, 8)
        })


# --- HILO DE AUDIO ---
def escuchar_microfono():
    global indice_texto, hablando, boca_estado
    reconocedor = sr.Recognizer()
    mic = sr.Microphone()

    with mic as source:
        reconocedor.adjust_for_ambient_noise(source)

        while indice_texto < len(HISTORIA):
            try:
                audio = reconocedor.listen(source, phrase_time_limit=3)
                hablando = True
                boca_estado = "abierta"

                voz_usuario = reconocedor.recognize_google(audio, language="es-ES").lower()
                palabra_clave = HISTORIA[indice_texto].lower()

                if palabra_clave in voz_usuario or any(w in voz_usuario for w in palabra_clave.split()):
                    indice_texto += 1
                    boca_estado = "sorpresa"
                    crear_confeti()  # ¡Lluvia de colores al acertar!
                    pygame.time.wait(400)

            except sr.UnknownValueError:
                pass
            except sr.RequestError:
                print("Error de conexión.")

            hablando = False
            boca_estado = "cerrada"


hilo_voz = threading.Thread(target=escuchar_microfono, daemon=True)
hilo_voz.start()

font = pygame.font.SysFont("comicsansms", 40)

# --- BUCLE PRINCIPAL ---
while True:
    contador_tiempo += 0.05
    screen.fill((240, 240, 255))

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            pygame.quit()
            sys.exit()

    # 1. ANIMACIÓN DE LAS MANOS
    mano_izq_y = 350 + math.sin(contador_tiempo * 2) * 15
    mano_der_y = 350 + math.cos(contador_tiempo * 2) * 15
    if hablando:
        mano_izq_y += math.sin(contador_tiempo * 5) * 10
        mano_der_y += math.cos(contador_tiempo * 5) * 10

    # 2. DIBUJAR EL AVATAR
    pygame.draw.circle(screen, (100, 180, 244), (400, 300), 100)
    pygame.draw.circle(screen, (255, 255, 255), (360, 270), 20)
    pygame.draw.circle(screen, (255, 255, 255), (440, 270), 20)
    pygame.draw.circle(screen, (0, 0, 0), (360, 270), 8)
    pygame.draw.circle(screen, (0, 0, 0), (440, 270), 8)

    # 3. RENDERIZADO DE LA BOCA
    if boca_estado == "cerrada":
        pygame.draw.line(screen, (0, 0, 0), (370, 340), (430, 340), 6)
    elif boca_estado == "abierta":
        pygame.draw.ellipse(screen, (200, 50, 50), (375, 320, 50, 40))
    elif boca_estado == "sorpresa":
        pygame.draw.circle(screen, (220, 50, 50), (400, 335), 30)

    # 4. LAS MANOS
    pygame.draw.circle(screen, (255, 215, 0), (260, int(mano_izq_y)), 25)
    pygame.draw.circle(screen, (255, 215, 0), (540, int(mano_der_y)), 25)

    # 5. ACTUALIZAR Y DIBUJAR CONFETI
    for p in particulas[:]:
        p["x"] += p["vx"]
        p["y"] += p["vy"]
        p["vy"] += 0.2  # Gravedad simulada
        pygame.draw.circle(screen, p["color"], (int(p["x"]), int(p["y"])), p["radio"])
        if p["y"] > SCREEN_HEIGHT:
            particulas.remove(p)

    # 6. MOSTRAR EL TEXTO
    if indice_texto < len(HISTORIA):
        texto_pantalla = font.render(HISTORIA[indice_texto], True, (50, 50, 50))
    else:
        texto_pantalla = font.render("¡Fin de la historia! ⭐🎉", True, (40, 180, 40))

    text_rect = texto_pantalla.get_rect(center=(SCREEN_WIDTH / 2, 100))
    screen.blit(texto_pantalla, text_rect)

    pygame.display.flip()
    clock.tick(60)
