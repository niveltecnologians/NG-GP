import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto mt-16 max-w-sm">
      <h1 className="mb-1 text-center text-2xl font-bold">Iniciar sesión</h1>
      <p className="mb-6 text-center text-sm text-slate-500">Accede a tu gestor de proyectos</p>
      <div className="card p-6">
        <LoginForm />
      </div>
      <p className="mt-4 text-center text-sm text-slate-500">
        ¿No tienes cuenta? <a href="/register" className="font-medium text-brand-600">Regístrate</a>
      </p>
    </div>
  );
}
