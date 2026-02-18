import {
  ActionIcon,
  Combobox,
  Input,
  InputBase,
  useCombobox,
  type InputBaseProps,
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useState, type ReactNode } from "react";

interface NativeSelectProps extends InputBaseProps {
  data: string[];
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  placeholder?: string;
  error?: string;
  fullWidth?: boolean;
  clear?: boolean;
}

const NativeSelect = ({
  data,
  leftIcon,
  rightIcon,
  placeholder = "Pick value",
  clear,
  fullWidth,
  error,
  ...props
}: NativeSelectProps) => {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [value, setValue] = useState<string | null>(null);

  const options = data.map((item) => (
    <Combobox.Option value={item} key={item}>
      {item}
    </Combobox.Option>
  ));

  const remove =
    clear && value ? (
      <ActionIcon
        size="sm"
        variant="subtle"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setValue(null);
        }}
      >
        <IconX size={14} color={error ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-gray-6)'}
 />
      </ActionIcon >
    ) : (
      rightIcon || <Combobox.Chevron />
    );

  return (
    <Combobox
      store={combobox}
      withinPortal={false}
      width={fullWidth == true ? '100%' : undefined}
      onOptionSubmit={(val) => {
        setValue(val);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target  >
        <InputBase
          component="button"
          type="button"
          radius={'md'}
          error={error}
          pointer
          w={fullWidth == true ? '100%' : undefined}
          leftSection={leftIcon}
          rightSectionPointerEvents="auto"
          rightSection={remove}
          onClick={() => combobox.toggleDropdown()}
          {...props}
        >
          {value || <Input.Placeholder>{placeholder}</Input.Placeholder>}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options >{options}</Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};

export default NativeSelect;
