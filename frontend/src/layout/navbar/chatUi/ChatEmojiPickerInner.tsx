import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

type Props = {
  onSelect: (emoji: string) => void;
};

const ChatEmojiPickerInner = ({ onSelect }: Props) => (
  <Picker
    data={data}
    locale="ko"
    theme="auto"
    previewPosition="none"
    skinTonePosition="search"
    onEmojiSelect={(emoji: { native?: string }) => {
      if (emoji?.native) onSelect(emoji.native);
    }}
  />
);

export default ChatEmojiPickerInner;
