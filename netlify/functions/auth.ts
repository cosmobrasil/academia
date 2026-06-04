import bcrypt from "bcryptjs";
import { getUsers, updatePassword } from "../lib/userStore";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function token(username: string): string {
  const payload = JSON.stringify({ username, ts: Date.now() });
  return Buffer.from(payload).toString("base64");
}

export const handler = async (event: any) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  let body: any;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "JSON inválido" }) };
  }

  const { action, username, password, newPassword } = body;

  if (!username || !password) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Usuário e senha são obrigatórios" }) };
  }

  const users = await getUsers();
  const user = users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());

  if (!user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Usuário não encontrado" }) };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Senha incorreta" }) };
  }

  // Change password flow
  if (action === "changePassword") {
    if (!newPassword || newPassword.length < 4) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Nova senha deve ter no mínimo 4 caracteres" }) };
    }

    try {
      const newHash = await bcrypt.hash(newPassword, 10);
      await updatePassword(username, newHash);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Senha alterada com sucesso" }),
      };
    } catch (e: any) {
      if (e.message === "BLOB_STORE_UNAVAILABLE") {
        return { statusCode: 503, headers, body: JSON.stringify({ error: "Serviço de armazenamento indisponível no momento. Tente novamente mais tarde." }) };
      }
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Erro ao alterar senha" }) };
    }
  }

  // Default: login
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ token: token(user.username), username: user.username, message: "Login bem-sucedido" }),
  };
};
