import ChatSidebar from "@/components/ChatSidebar";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Chat</h1>
        <p className="text-sm text-slate-500">Conversa en privado con cualquier persona registrada</p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <ChatSidebar />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
