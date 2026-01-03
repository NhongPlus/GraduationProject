// components/InputBase.tsx
import {
  TextInput,
  PasswordInput,
  type TextInputProps,
  type PasswordInputProps,
} from "@mantine/core";
import { type ReactNode } from "react";
import styles from "./InputBase.module.scss";

type InputType = "text" | "email" | "tel" | "number" | "search" | "url" | "password";

type CustomInputProps = Omit<TextInputProps & PasswordInputProps, "type"> & {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fontWeight?: number | string;
  placeholder: string;
  label: string | ReactNode;
  required?: boolean;
  inputType?: InputType;
};

const InputBase = ({
  leftIcon,
  rightIcon,
  placeholder,
  label,
  fontWeight = 500,
  required = false,
  inputType = "text",
  ...props // các prop còn lại: error, description, size, variant, v.v.
}: CustomInputProps) => {
  // Props chung cho cả hai
  const sharedProps = {
    leftSection: leftIcon,
    rightSection: rightIcon,
    placeholder,
    label,
    required,
    radius: "lg",
    classNames: {
      input: styles.rootInput,
      wrapper: styles.rootWrapper,
      label: styles.rootLabel,
    },
    styles: {
      input: { fontWeight }
    },
  };

  if (inputType === "password") {
    return (
      <PasswordInput
        {...sharedProps}
        classNames={{
          input: styles.rootInput,
          wrapper: styles.rootWrapper,
          label: styles.rootLabel,
        }}
        {...(props as PasswordInputProps)}
      />
    );
  }

  return (
    <TextInput
      {...sharedProps}
      classNames={{
        input: styles.rootInput,
        wrapper: styles.rootWrapper,
        label: styles.rootLabel,
      }}
      {...(props as TextInputProps)}
      type={inputType}
    />
  );
};

export default InputBase;