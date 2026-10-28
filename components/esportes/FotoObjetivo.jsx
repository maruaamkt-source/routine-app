"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const BUCKET = "objetivos";

// reduz a foto (lado maior 1200px) e converte para JPEG
function comprimir(arquivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      const max = 1200;
      const escala = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Falha ao converter"))),
        "image/jpeg",
        0.8
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não consegui ler a imagem"));
    };
    img.src = url;
  });
}

export default function FotoObjetivo({ user, meta }) {
  const [caminho, setCaminho] = useState("");
  const [url, setUrl] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const inputRef = useRef(null);

  async function gerarUrl(path) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600);
    return error ? "" : data.signedUrl;
  }

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      const { data, error } = await supabase
        .from("health_settings")
        .select("goal_photo_path")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelado) return;
      if (error) {
        setErro("Não consegui carregar a foto: " + error.message);
        setCarregando(false);
        return;
      }
      const path = data && data.goal_photo_path ? data.goal_photo_path : "";
      setCaminho(path);
      if (path) {
        const u = await gerarUrl(path);
        if (!cancelado) setUrl(u);
      }
      setCarregando(false);
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [user.id]);

  async function salvarCaminho(path) {
    return supabase.from("health_settings").upsert(
      {
        user_id: user.id,
        workouts_per_week: meta,
        goal_photo_path: path,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  }

  async function escolher(e) {
    const arquivo = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) {
      setErro("Escolha um arquivo de imagem.");
      return;
    }
    setErro("");
    setEnviando(true);
    try {
      const blob = await comprimir(arquivo);
      const novo = `${user.id}/objetivo-${Date.now()}.jpg`;

      const { error: erroUp } = await supabase.storage
        .from(BUCKET)
        .upload(novo, blob, { contentType: "image/jpeg" });
      if (erroUp) throw new Error(erroUp.message);

      const { error: erroDb } = await salvarCaminho(novo);
      if (erroDb) {
        await supabase.storage.from(BUCKET).remove([novo]);
        throw new Error(erroDb.message);
      }

      const antigo = caminho;
      setCaminho(novo);
      setUrl(await gerarUrl(novo));
      if (antigo) await supabase.storage.from(BUCKET).remove([antigo]);
    } catch (err) {
      setErro("Não consegui salvar a foto: " + err.message);
    }
    setEnviando(false);
  }

  async function remover() {
    if (!caminho || !window.confirm("Remover a foto do objetivo?")) return;
    setErro("");
    const { error } = await salvarCaminho(null);
    if (error) {
      setErro("Não consegui remover: " + error.message);
      return;
    }
    await supabase.storage.from(BUCKET).remove([caminho]);
    setCaminho("");
    setUrl("");
  }

  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <p className="mb-3 text-xs uppercase tracking-wide text-mute">
        Meu objetivo
      </p>

      {erro && <p className="mb-3 text-sm text-bone">{erro}</p>}

      {carregando ? (
        <p className="text-sm text-mute">Carregando...</p>
      ) : url ? (
        <>
          <img
            src={url}
            alt="Foto do meu objetivo"
            className="mx-auto h-auto max-h-[80vh] w-auto max-w-full rounded-lg border border-line object-contain"
          />
          <div className="mt-3 flex items-center gap-4 text-sm">
            <button
              type="button"
              onClick={() => inputRef.current && inputRef.current.click()}
              disabled={enviando}
              className="text-ember hover:underline disabled:opacity-40"
            >
              {enviando ? "Enviando..." : "Trocar foto"}
            </button>
            <button
              type="button"
              onClick={remover}
              disabled={enviando}
              className="text-mute hover:text-bone"
            >
              Remover
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-mute">
            Coloque uma foto do shape que você quer alcançar. Só você vê.
          </p>
          <button
            type="button"
            onClick={() => inputRef.current && inputRef.current.click()}
            disabled={enviando}
            className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink disabled:opacity-40"
          >
            {enviando ? "Enviando..." : "+ Adicionar foto"}
          </button>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={escolher}
        className="hidden"
      />
    </div>
  );
}