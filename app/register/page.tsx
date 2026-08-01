import RegisterForm from "./RegisterForm";

export default function RegisterPage() {
  return (
    <div className="mx-auto mt-16 max-w-sm">
      <h1 className="mb-1 text-center text-2xl font-bold">Crear cuenta</h1>
      <p className="mb-6 text-center text-sm text-slate-500">El primer usuario registrado será administrador</p>
      <div className="card p-6">
        <RegisterForm />
      </div>
      <p className="mt-4 text-center text-sm text-slate-500">
        ¿Ya tienes cuenta? <a href="/login" className="font-medium text-brand-600">Inicia sesión</a>
      </p>
    </div>
  );
}
