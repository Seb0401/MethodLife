// All user-facing text lives here (see CLAUDE.md conventions).
export const es = {
  app: {
    name: "MethodLife",
    tagline: "Gestiona tu vida con métodos de ingeniería de software",
    description: "Proyectos, metas y hábitos con Scrum, Kanban, FDD y más, en un solo sistema.",
  },
  home: {
    status: "En construcción — Fase 0: Fundaciones",
    greeting: "Hola",
  },
  auth: {
    login: {
      title: "Iniciar sesión",
      submit: "Entrar",
      noAccount: "¿No tienes cuenta?",
      registerLink: "Regístrate",
    },
    register: {
      title: "Crear cuenta",
      submit: "Registrarme",
      hasAccount: "¿Ya tienes cuenta?",
      loginLink: "Inicia sesión",
    },
    fields: {
      displayName: "Nombre",
      email: "Correo electrónico",
      password: "Contraseña",
    },
    logout: "Cerrar sesión",
    messages: {
      checkEmail: "Cuenta creada. Revisa tu correo para confirmarla antes de entrar.",
    },
    errors: {
      invalidCredentials: "Correo o contraseña incorrectos.",
      emailInvalid: "Escribe un correo válido.",
      passwordMin: "La contraseña debe tener al menos 8 caracteres.",
      nameRequired: "El nombre es obligatorio.",
      signUpFailed: "No se pudo crear la cuenta. Intenta de nuevo.",
      confirmFailed: "No se pudo confirmar la cuenta. Intenta iniciar sesión.",
    },
  },
  workspace: {
    personalName: "Personal",
    selectorLabel: "Workspaces",
  },
  nav: {
    hoy: "Hoy",
    inbox: "Bandeja de entrada",
    areas: "Áreas y metas",
    proyectos: "Proyectos",
    habitos: "Hábitos",
    rutinas: "Rutinas",
    invariantes: "Invariantes",
    mapa: "Mapa",
    insights: "Insights",
    metodos: "Métodos",
    workspace: "Workspace",
  },
  modulePlaceholder: {
    title: "Módulo en construcción",
    body: "Esta sección llegará en una fase posterior del roadmap.",
  },
  errors: {
    unauthorized: "Debes iniciar sesión.",
    notWorkspaceMember: "No tienes acceso a este workspace.",
  },
} as const;

export type Es = typeof es;
