import { Button, type ButtonProps } from "@mantine/core";
import { type ReactNode } from "react";
import styles from './ButtonBase.module.scss';

type CustomButtonProps = ButtonProps & {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  label?: string;
  fontWeight?: number;
};

// Button cơ bản (nếu cần dùng trực tiếp)
const ButtonBase = ({
  leftIcon,
  rightIcon,
  label,
  children,
  fontWeight = 700,
  ...props
}: CustomButtonProps) => (
  <Button
    leftSection={leftIcon}
    rightSection={rightIcon}
    radius={'lg'}
    {...props}
    style={{
      fontWeight : fontWeight
    }}
  >
    {label || children}
  </Button>
);

export const PrimaryButton = (props: CustomButtonProps) => (
  <ButtonBase
    variant="filled"
    color="blue" // dùng tên màu để dark mode tự adjust
    {...props}
  />
);

export const SecondaryButton = (props: CustomButtonProps) => (
  <ButtonBase
    variant="light"
    {...props}
  />
);

export const OutlineButton = (props: CustomButtonProps) => (
  <ButtonBase
    variant="outline"
    color="blue"
    {...props}
  />
);
export const TransparentButton = (props: CustomButtonProps) => (
  <ButtonBase
    variant="transparent"
    color="blue"
    {...props}
  />
);

export default ButtonBase;