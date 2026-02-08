import {
    IconAdjustments,
    IconCalendarStats,
    IconFileAnalytics,
    IconGauge,
    IconLock,
    IconNotes,
    IconPresentationAnalytics,
    IconChevronRight,
} from '@tabler/icons-react';
import {
    Group,
    ScrollArea,
    Text,
    UnstyledButton,
    Collapse,
    Avatar,
    Box,
    Stack,
} from '@mantine/core';
import { useState, type ComponentType } from 'react';
import classes from './NavbarNested.module.css';

/* ================== LinksGroup ================== */
type NavLink = { label: string; link: string };
type LinksGroupProps = {
    label: string;
    icon: ComponentType<{ size?: number }>;
    links?: NavLink[];
    initiallyOpened?: boolean;
};

function LinksGroup({ label, icon: Icon, links, initiallyOpened = false }: LinksGroupProps) {
    const hasLinks = Array.isArray(links);
    const [opened, setOpened] = useState(initiallyOpened);

    return (
        <>
            <UnstyledButton
                onClick={() => hasLinks && setOpened((o) => !o)}
                className={classes.control}
            >
                <Group justify="space-between" gap={0}>
                    <Group gap="sm">
                        <Icon size={18} />
                        <Text size="sm">{label}</Text>
                    </Group>

                    {hasLinks && (
                        <IconChevronRight
                            size={16}
                            className={classes.chevron}
                            style={{
                                transform: opened ? 'rotate(90deg)' : 'none',
                            }}
                        />
                    )}
                </Group>
            </UnstyledButton>

            {hasLinks && (
                <Collapse in={opened}>
                    {links.map((link) => (
                        <Text
                            key={link.label}
                            component="a"
                            href={link.link}
                            className={classes.link}
                        >
                            {link.label}
                        </Text>
                    ))}
                </Collapse>
            )}
        </>
    );
}

/* ================== UserButton ================== */
function UserButton() {
    return (
        <UnstyledButton className={classes.user}>
            <Group>
                <Avatar radius="xl" />

                <Box style={{ flex: 1 }}>
                    <Text size="sm" fw={500}>
                        NhongPlus
                    </Text>
                    <Text c="dimmed" size="xs">
                        frontend@dev.com
                    </Text>
                </Box>
            </Group>
        </UnstyledButton>
    );
}

/* ================== DATA ================== */
const mockdata = [
    { label: 'Dashboard', icon: IconGauge },
    {
        label: 'Market news',
        icon: IconNotes,
        initiallyOpened: true,
        links: [
            { label: 'Overview', link: '/' },
            { label: 'Forecasts', link: '/' },
            { label: 'Outlook', link: '/' },
            { label: 'Real time', link: '/' },
        ],
    },
    {
        label: 'Releases',
        icon: IconCalendarStats,
        links: [
            { label: 'Upcoming releases', link: '/' },
            { label: 'Previous releases', link: '/' },
            { label: 'Releases schedule', link: '/' },
        ],
    },
    { label: 'Analytics', icon: IconPresentationAnalytics },
    { label: 'Contracts', icon: IconFileAnalytics },
    { label: 'Settings', icon: IconAdjustments },
    {
        label: 'Security',
        icon: IconLock,
        links: [
            { label: 'Enable 2FA', link: '/' },
            { label: 'Change password', link: '/' },
            { label: 'Recovery codes', link: '/' },
        ],
    },
];

/* ================== Navbar ================== */
export function NavbarNested() {
    return (
        <nav className={classes.navbar}>
            <ScrollArea className={classes.links}>
                <div className={classes.linksInner}>
                    {mockdata.map((item) => (
                        <LinksGroup key={item.label} {...item} />
                    ))}
                </div>
            </ScrollArea>

            <Stack justify="center" gap={0}>
                <UserButton />
            </Stack>
        </nav>
    );
}
