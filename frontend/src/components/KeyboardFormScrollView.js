import React, { forwardRef } from "react";
import { Platform } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

// Keep the focused field/caret close to the keyboard, without moving the whole form up.
export const INPUT_KEYBOARD_GAP = 12;

const KeyboardFormScrollView = forwardRef(
  function KeyboardFormScrollView(props, ref) {
    return (
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        {...props}
        ref={ref}
        bottomOffset={INPUT_KEYBOARD_GAP}
        disableScrollOnKeyboardHide
        automaticallyAdjustKeyboardInsets={false}
      />
    );
  },
);

export default KeyboardFormScrollView;
