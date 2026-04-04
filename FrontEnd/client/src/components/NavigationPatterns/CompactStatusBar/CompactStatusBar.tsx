import { Button, Group, Text } from "@mantine/core";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import style from "./CompactStatusBar.module.scss";

interface CompactStatusBarProps {
  page?: number;
  total?: number;
}

export default function CompactStatusBar({ page = 2, total = 12 }: CompactStatusBarProps) {
  return (
    <Group justify="space-between" wrap="nowrap" className={style.root}>
      <Button variant="default" radius="xl" leftSection={<IconArrowLeft size={14} />}>Previous</Button>
      <Text className={style.statusText}>Page {page} of {total}</Text>
      <Button variant="default" radius="xl" rightSection={<IconArrowRight size={14} />}>Next</Button>
    </Group>
  );
}
