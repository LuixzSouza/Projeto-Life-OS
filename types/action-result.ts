/**
 * Retorno padrão de uma Server Action: sucesso + mensagem pronta para o toast.
 * Vive fora dos arquivos "use server" porque vários módulos de ação o compartilham
 * — e dois barrels exportando o MESMO nome geram ambiguidade no re-export.
 */
export interface ActionResult {
  success: boolean;
  message: string;
}
