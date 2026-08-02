import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto mt-12 max-w-sm sm:mt-20">
      <div className="mb-6 flex flex-col items-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white shadow-card-hover">
          GP
        </div>
        <h1 className="text-center text-2xl font-bold text-slate-900">Iniciar sesión</h1>
        <p className="mt-1 text-center text-sm text-slate-500">Accede a tu gestor de proyectos</p>
      </div>
      <div className="card p-6 sm:p-7">
        <LoginForm />
      </div>
      <p className="mt-5 text-center text-sm text-slate-500">
        ¿No tienes cuenta?{" "}
        <a href="/register" className="font-medium text-brand-600 hover:text-brand-700">
          Regístrate
        </a>
      </p>
    </div>
  );
}
