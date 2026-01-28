"use client";

import { useEffect } from "react";

export function ConsoleWelcome() {
  useEffect(() => {
    // Verifica se já rodou nesta sessão para não poluir se der F5
    const hasRun = sessionStorage.getItem("console-welcome-shown");
    if (hasRun) return;
    sessionStorage.setItem("console-welcome-shown", "true");

    // Limpa o console para dar destaque total à sua arte
    try {
        console.clear();
    } catch (e) {}

    // --- ESTILOS CSS PARA O CONSOLE ---
    
    // Estilo do título principal (Neon Azul/Ciano)
    const titleStyle = [
      "font-size: 16px",
      "font-family: monospace",
      "background: #09090b", // Fundo escuro
      "color: #22d3ee",      // Ciano Neon
      "padding: 10px 20px",
      "border: 1px solid #22d3ee",
      "border-radius: 5px",
      "box-shadow: 0 0 10px rgba(34, 211, 238, 0.2)"
    ].join(";");

    // Estilo do texto comum
    const textStyle = [
      "font-size: 12px",
      "font-family: monospace",
      "color: #a1a1aa", // Cinza claro
      "line-height: 1.5",
    ].join(";");

    // Estilo de Alerta (Vermelho)
    const warningStyle = [
      "font-size: 14px",
      "font-family: monospace",
      "background: #7f1d1d", // Vermelho escuro fundo
      "color: #fecaca",      // Vermelho claro texto
      "padding: 5px 10px",
      "border-radius: 4px",
      "font-weight: bold",
      "margin-top: 10px"
    ].join(";");

    // --- ARTE ASCII ---
    // Você pode trocar esse desenho em sites como "Text to ASCII Art Generator"
    const asciiArt = `
    ██╗     ██╗███████╗███████╗     ██████╗ ███████╗
    ██║     ██║██╔════╝██╔════╝    ██╔═══██╗██╔════╝
    ██║     ██║█████╗  █████╗      ██║   ██║███████╗
    ██║     ██║██╔══╝  ██╔══╝      ██║   ██║╚════██║
    ███████╗██║██║     ███████╗    ╚██████╔╝███████║
    ╚══════╝╚═╝╚═╝     ╚══════╝     ╚═════╝ ╚══════╝
    `;

    // --- EXIBIÇÃO ---

    // 1. A Arte ASCII em Ciano
    console.log(`%c${asciiArt}`, "color: #22d3ee; font-weight: bold; font-family: monospace;");
    
    // 2. O Status do Sistema
    console.log("%c  SYSTEM ONLINE  ", titleStyle);
    
    console.log(
      "%c\n > Núcleo.....: Conectado \n > Segurança..: Ativa \n > Banco......: Sincronizado",
      textStyle
    );

    // 3. O Aviso de Segurança (Bem chamativo)
    console.log(
      "%c⚠️ ATENÇÃO: Esta é uma ferramenta de desenvolvedor. Não cole códigos aqui se não souber o que fazem.",
      warningStyle
    );

    console.log(
      "%c\nDesenvolvido com ❤️ no Life OS.",
      "color: #52525b; font-size: 10px; font-style: italic;"
    );

  }, []);

  return null;
}