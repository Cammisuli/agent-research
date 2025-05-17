import { initChatModel } from "langchain/chat_models/universal";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

/**
 * Load a chat model from a fully specified name or use a provided model instance.
 * @param modelNameOrInstance - String in the format 'provider/model' or 'provider/account/provider/model', or a BaseChatModel instance.
 * @returns A Promise that resolves to a BaseChatModel instance.
 */
export async function loadChatModel(
  modelNameOrInstance: string | BaseChatModel,
): Promise<BaseChatModel | ReturnType<typeof initChatModel>> {
  // If it's already a model instance, return it directly
  if (typeof modelNameOrInstance !== "string") {
    return modelNameOrInstance;
  }
  
  const index = modelNameOrInstance.indexOf("/");
  if (index === -1) {
    // If there's no "/", assume it's just the model
    return await initChatModel(modelNameOrInstance);
  } else {
    const provider = modelNameOrInstance.slice(0, index);
    const model = modelNameOrInstance.slice(index + 1);
    return await initChatModel(model, { modelProvider: provider });
  }
}
