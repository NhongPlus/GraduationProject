import {
    IconCalendarStats,
    IconFileAnalytics,
    IconGauge,
    IconLock,
    IconNotes,
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
import { useNavigate } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
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
    const navigate = useNavigate();
    const name = localStorage.getItem('user_name') || 'NhongPlus';
    const email = localStorage.getItem('user_email') || 'frontend@dev.com';

    return (
        <UnstyledButton className={classes.user} onClick={() => navigate('/profile')}>
            <Group>
                <Avatar radius="xl" />

                <Box style={{ flex: 1 }}>
                    <Text size="sm" fw={500}>
                        {name}
                    </Text>
                    <Text c="dimmed" size="xs">
                        {email}
                    </Text>
                </Box>
            </Group>
        </UnstyledButton>
    );
}

/* ================== DATA ================== */
const adminNav = [
    { label: 'Dashboard', icon: IconGauge },
    {
        label: 'Bài thi',
        icon: IconFileAnalytics,
        initiallyOpened: true,
        links: [
            { label: 'Danh sách bài thi', link: '/exams' },
            { label: 'Dự đoán điểm', link: '/prediction' },
        ],
    },
    {
        label: 'Quản lý sinh viên',
        icon: IconCalendarStats,
        links: [
            { label: 'Danh sách sinh viên', link: '/admin/students' },
        ],
    },
];

const studentNav = [
    { label: 'Dashboard', icon: IconGauge },
    {
        label: 'Bài thi',
        icon: IconFileAnalytics,
        initiallyOpened: true,
        links: [
            { label: 'Danh sách bài thi', link: '/exams' },
            { label: 'Dự đoán điểm', link: '/prediction' },
        ],
    },
    {
        label: 'Sinh viên',
        icon: IconNotes,
        links: [
            { label: 'Kết quả của tôi', link: '/my-results' },
        ],
    },
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
    const { userAuthority } = useAuth();
    const isAdmin = userAuthority.includes('admin');
    const isClient = userAuthority.includes('user');

    const links = isAdmin ? adminNav : isClient ? studentNav : [{ label: 'Dashboard', icon: IconGauge }];

    return (
        <nav className={classes.navbar}>
            <ScrollArea className={classes.links}>
                <div className={classes.linksInner}>
                    {links.map((item) => (
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
