import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import AvatarUploader from "./AvatarUploader";
import ProfileForm from "./ProfileForm";
import PasswordForm from "./PasswordForm";
import EnvironmentForm from "./EnvironmentForm";

export default async function ProfilePage() {
  const user = await requireUser();

  const profile = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      bio: true,
      hasAvatar: true,
      backgroundColor: true,
      hasBackgroundImage: true
    }
  });
  if (!profile) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <p className="text-sm text-slate-500">Tu información, foto y personalización del entorno</p>
      </div>

      <div className="space-y-6">
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">Foto e información</h2>
          <AvatarUploader userId={profile.id} initialHasAvatar={profile.hasAvatar} name={profile.name} />
          <div className="mt-6">
            <ProfileForm initialName={profile.name} initialBio={profile.bio || ""} email={profile.email} />
          </div>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">Cambiar contraseña</h2>
          <PasswordForm />
        </div>

        <div className="card p-6">
          <h2 className="mb-1 text-lg font-semibold">Entorno</h2>
          <p className="mb-4 text-sm text-slate-500">
            Personaliza el fondo de tu pantalla. Solo lo ves tú, no afecta a los demás usuarios.
          </p>
          <EnvironmentForm
            initialColor={profile.backgroundColor}
            initialHasImage={profile.hasBackgroundImage}
          />
        </div>
      </div>
    </div>
  );
}
