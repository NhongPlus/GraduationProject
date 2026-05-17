import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Box,
  InputBase,
  InputWrapper,
  Popover,
  ScrollArea,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronDown, IconChevronRight, IconSearch, IconX } from '@tabler/icons-react';
import type { SubjectDto } from '@/services/subjectApi';
import {
  formatSubjectLabel,
  groupSubjectsByCategory,
  type SubjectCategoryGroup,
} from './subjectGrouping';
import styles from './SubjectCategoryPicker.module.scss';

export type { SubjectCategoryGroup };

export interface SubjectCategoryPickerProps {
  label?: string;
  placeholder?: string;
  subjects: SubjectDto[];
  value?: string | null;
  onChange?: (subjectId: string | null) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  size?: 'xs' | 'sm' | 'md';
}

export default function SubjectCategoryPicker({
  label,
  placeholder = 'Chọn môn học',
  subjects,
  value = null,
  onChange,
  error,
  helperText,
  disabled = false,
  required = false,
  size = 'sm',
}: SubjectCategoryPickerProps) {
  const [opened, { close, toggle }] = useDisclosure(false);
  const groups = useMemo(() => groupSubjectsByCategory(subjects), [subjects]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const selected = useMemo(
    () => subjects.find((s) => s.id === value) ?? null,
    [subjects, value]
  );

  const activeGroup = useMemo(() => {
    if (!groups.length) return null;
    const key = activeCategory ?? groups[0].category;
    return groups.find((g) => g.category === key) ?? groups[0];
  }, [groups, activeCategory]);

  const filteredSubjects = useMemo(() => {
    if (!activeGroup) return [];
    const q = search.trim().toLowerCase();
    if (!q) return activeGroup.subjects;
    return activeGroup.subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.code ?? '').toLowerCase().includes(q)
    );
  }, [activeGroup, search]);

  // Khởi tạo / đồng bộ khối khi đổi danh sách môn hoặc value — không ghi đè khi user bấm cột trái
  useEffect(() => {
    if (!groups.length) {
      setActiveCategory(null);
      return;
    }
    setActiveCategory((prev) => {
      if (prev && groups.some((g) => g.category === prev)) return prev;
      return selected?.category ?? groups[0].category;
    });
  }, [groups, value, selected?.category]);

  useEffect(() => {
    if (opened && selected) {
      setActiveCategory(selected.category);
    }
  }, [opened, selected?.id, selected?.category]);

  const displayValue = selected ? formatSubjectLabel(selected) : '';

  const handlePick = (subjectId: string) => {
    onChange?.(subjectId);
    setSearch('');
    close();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(null);
    setSearch('');
  };

  return (
    <InputWrapper
      label={label}
      error={error}
      description={helperText}
      required={required}
      withAsterisk={required}
      className={styles.root}
    >
      <Popover
        opened={opened}
        onChange={(o) => !o && close()}
        position="bottom-start"
        width={480}
        shadow="md"
        disabled={disabled}
        withinPortal
      >
        <Popover.Target>
          <InputBase
            component="button"
            type="button"
            size={size}
            className={styles.input}
            data-disabled={disabled || undefined}
            data-error={error || undefined}
            pointer
            disabled={disabled}
            onClick={() => !disabled && toggle()}
            rightSection={
              <Box style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {value && !disabled ? (
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    onClick={handleClear}
                    aria-label="Xóa lựa chọn"
                  >
                    <IconX size={14} />
                  </ActionIcon>
                ) : null}
                <IconChevronDown
                  size={16}
                  style={{
                    transform: opened ? 'rotate(180deg)' : undefined,
                    transition: 'transform 0.2s',
                  }}
                />
              </Box>
            }
          >
            {displayValue || (
              <Text span c="dimmed" size={size}>
                {placeholder}
              </Text>
            )}
          </InputBase>
        </Popover.Target>

        <Popover.Dropdown className={styles.dropdown} p={0}>
          <Box className={styles.search}>
            <TextInput
              size="xs"
              placeholder="Tìm môn trong khối đang chọn..."
              leftSection={<IconSearch size={14} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
            />
          </Box>
          <Box className={styles.panels}>
            <ScrollArea className={styles.categories} type="auto" offsetScrollbars>
              {groups.map((group) => (
                <UnstyledButton
                  key={group.category}
                  className={styles.categoryRow}
                  data-active={activeGroup?.category === group.category}
                  onClick={() => {
                    setActiveCategory(group.category);
                    setSearch('');
                  }}
                >
                  <Text size="sm" lineClamp={2} style={{ flex: 1 }}>
                    {group.label}
                  </Text>
                  <IconChevronRight size={14} style={{ flexShrink: 0, opacity: 0.5 }} />
                </UnstyledButton>
              ))}
            </ScrollArea>

            <ScrollArea className={styles.subjects} type="auto" offsetScrollbars>
              {filteredSubjects.length === 0 ? (
                <Text className={styles.emptyPanel}>Không có môn phù hợp</Text>
              ) : (
                filteredSubjects.map((subject) => (
                  <UnstyledButton
                    key={subject.id}
                    className={styles.subjectRow}
                    data-selected={value === subject.id}
                    onClick={() => handlePick(subject.id)}
                  >
                    <Box>
                      <Text size="sm" fw={value === subject.id ? 600 : 400}>
                        {subject.name}
                      </Text>
                      {subject.code ? (
                        <Text size="xs" c="dimmed">
                          {subject.code}
                          {subject.credits ? ` · ${subject.credits} TC` : ''}
                        </Text>
                      ) : null}
                    </Box>
                  </UnstyledButton>
                ))
              )}
            </ScrollArea>
          </Box>
        </Popover.Dropdown>
      </Popover>
    </InputWrapper>
  );
}
