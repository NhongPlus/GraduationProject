import {
  Combobox,
  useCombobox,
  Pill,
  PillsInput,
  CheckIcon,
} from "@mantine/core";

import { useState } from "react";
import style from "./InputMultiSelect.module.scss";

interface Props {
  data: string[];
  placeholder?: string;
}

export default function InputMultiSelect({
  data,
  placeholder = "Add topic",
}: Props) {
  const combobox = useCombobox({
    onDropdownClose: () =>
      combobox.resetSelectedOption(),
  });

  const [search, setSearch] = useState("");
  const [value, setValue] = useState<string[]>([]);

  // toggle select / unselect
  const toggle = (item: string) => {
    setValue((prev) =>
      prev.includes(item)
        ? prev.filter((v) => v !== item)
        : [...prev, item]
    );
  };

  // filter local search
  const filtered = data.filter((item) =>
    item
      .toLowerCase()
      .includes(search.toLowerCase().trim())
  );

  // options render
  const options = filtered.map((item) => {
    const selected = value.includes(item);

    return (
      <Combobox.Option
        key={item}
        value={item}
        className={`${style.option} ${selected ? style.optionSelected : ""
          }`}
      >
        {item}

        {selected && (
          <CheckIcon
            size={16}
            className={style.check}
          />
        )}
      </Combobox.Option>
    );
  });

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => {
        toggle(val);
        setSearch("");
        combobox.updateSelectedOptionIndex(
          "active"
        );
      }}
      radius="md"
    >
      <Combobox.Target>
        <PillsInput
          className={style.pillsInput}
          onClick={() =>
            combobox.openDropdown()
          }
          radius="md"
        >
          <Pill.Group>
            {value.map((item) => (
              <Pill
                key={item}
                withRemoveButton
                onRemove={() =>
                  toggle(item)
                }
                className={style.pill}
              >
                {item}
              </Pill>
            ))}
            <Combobox.EventsTarget>
              <PillsInput.Field
                value={search}
                placeholder={placeholder}
                onFocus={() =>
                  combobox.openDropdown()
                }
                onChange={(event) => {
                  setSearch(
                    event.currentTarget.value
                  );

                  combobox.openDropdown();
                  combobox.updateSelectedOptionIndex();
                }}
                onBlur={() =>
                  combobox.closeDropdown()
                }
              />
            </Combobox.EventsTarget>
          </Pill.Group>
        </PillsInput>
      </Combobox.Target>

      {/* DROPDOWN */}
      <Combobox.Dropdown
        className={style.dropdown}
      >
        <Combobox.Options className={style.options}>
          {options.length > 0 ? (
            options
          ) : (
            <Combobox.Empty>
              Nothing found
            </Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>

    </Combobox>
  );
}