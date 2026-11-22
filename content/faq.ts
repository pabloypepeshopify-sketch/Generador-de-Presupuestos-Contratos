/**
 * Preguntas frecuentes.
 *  - a: respuesta confirmada (o null si aún no está decidida).
 *  - pending: lo que falta por confirmar. Fuera de producción se ve como
 *    etiqueta «TODO: confirmar»; en producción, una pregunta sin respuesta no sale.
 */
export type Faq = { q: string; a: string | null; pending?: string };

export const faqs: Faq[] = [
  {
    q: '¿Necesito saber de tecnología?',
    a: 'No. Tú nos cuentas cómo funciona tu empresa y qué te gustaría mejorar; nosotros nos encargamos de encontrar la tecnología adecuada y aplicarla. Te lo explicamos todo sin tecnicismos.',
  },
  {
    q: '¿Qué pasa en el diagnóstico inicial?',
    a: 'Nos reunimos contigo, en tu negocio o por videollamada, para entender cómo trabajáis: procesos, herramientas, equipo y clientes. Con eso te contamos qué se puede mejorar, por dónde empezar y qué plan encaja con tu empresa.',
    pending: 'TODO: confirmar si el diagnóstico tiene coste y cuánto dura.',
  },
  {
    q: '¿En qué se diferencian los planes?',
    a: 'En el nivel de dedicación y acompañamiento: cuánto trabajamos contigo cada mes, cuánto podemos implementar y con qué frecuencia revisamos y planificamos. No tienes que elegir automatizaciones sueltas; en el diagnóstico te recomendamos el plan que encaja.',
  },
  {
    q: '¿Puedo cambiar de plan?',
    a: null,
    pending: 'TODO: confirmar condiciones para subir o bajar de plan.',
  },
  {
    q: '¿Hay permanencia?',
    a: null,
    pending: 'TODO: confirmar si hay permanencia mínima y en qué condiciones.',
  },
  {
    q: '¿Trabajáis con mi sector?',
    a: 'El método sirve para cualquier empresa, porque partimos de cómo funciona la tuya. En el apartado de sectores tienes ejemplos de lo que se puede hacer en inmobiliarias, gestorías, clínicas, comercios, construcción y restauración.',
  },
  {
    q: '¿Puedo seguir usando las herramientas que ya tengo?',
    a: 'Partimos de lo que ya usas. Solo te proponemos cambiar algo cuando de verdad te ahorra trabajo o te da algo que ahora no tienes.',
  },
  {
    q: '¿En qué zona trabajáis?',
    a: 'Estamos en Sanlúcar de Barrameda y trabajamos en toda la provincia de Cádiz y Sevilla. Podemos ir a tu negocio: puedes reservar la visita directamente en esta web.',
  },
  {
    q: '¿Cuánto cuesta?',
    a: 'Depende del plan y de tu empresa. Lo vemos juntos en el diagnóstico y te damos el precio antes de empezar.',
    pending: 'TODO: confirmar precios de los planes (config/plans.ts).',
  },
];
