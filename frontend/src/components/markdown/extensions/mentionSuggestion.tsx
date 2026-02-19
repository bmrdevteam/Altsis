import { ReactRenderer } from "@tiptap/react";
import MentionList, { type MentionUser } from "../MentionList";

type SearchFn = (query: string) => Promise<MentionUser[]>;

export const createMentionSuggestion = (searchUsers: SearchFn) => ({
  items: async ({ query }: { query: string }) => {
    if (!query || query.length < 1) return [];
    try {
      return await searchUsers(query);
    } catch {
      return [];
    }
  },

  render: () => {
    let component: ReactRenderer | null = null;
    let popup: HTMLDivElement | null = null;

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        });

        popup = document.createElement("div");
        popup.style.position = "absolute";
        popup.style.zIndex = "1000";
        popup.appendChild(component.element);
        document.body.appendChild(popup);

        updatePopupPosition(props, popup);
      },

      onUpdate: (props: any) => {
        component?.updateProps(props);
        if (popup) updatePopupPosition(props, popup);
      },

      onKeyDown: (props: any) => {
        if (props.event.key === "Escape") {
          popup?.remove();
          component?.destroy();
          return true;
        }
        return (component?.ref as any)?.onKeyDown(props) ?? false;
      },

      onExit: () => {
        popup?.remove();
        component?.destroy();
      },
    };
  },
});

function updatePopupPosition(props: any, popup: HTMLDivElement) {
  const rect = props.clientRect?.();
  if (!rect || !popup) return;
  popup.style.left = `${rect.left}px`;
  popup.style.top = `${rect.bottom + 4}px`;
}
