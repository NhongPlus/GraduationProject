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
import { useTranslation } from 'react-i18next';
import useAuth from '@/hooks/useAuth';
import classes from './NavbarNested.module.css';

/* ================== LinksGroup ================== */
type NavLink = { label: string; link: string };
type LinksGroupProps = {
    label: string;
    icon: ComponentType<{ size?: number }>;
    links?: NavLink[];
    initiallyOpened?: boolean;
    link?: string;
};

function LinksGroup({ label, icon: Icon, links, initiallyOpened = false, link }: LinksGroupProps) {
    const navigate = useNavigate();
    const hasLinks = Array.isArray(links);
    const [opened, setOpened] = useState(initiallyOpened);

    const handleClick = () => {
        if (hasLinks) {
            setOpened((o) => !o);
            return;
        }

        if (link) {
            navigate(link);
        }
    };

    return (
        <>
            <UnstyledButton
                onClick={handleClick}
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

/* ================== Navbar ================== */
export function NavbarNested() {
    const { t } = useTranslation();
    const { userAuthority } = useAuth();
    const isAdmin = userAuthority.includes('admin');
    const isClient = userAuthority.includes('user');

    const adminNav = [
        { label: t('nav.main'), icon: IconGauge, link: '/main' },
        {
            label: t('nav.exams'),
            icon: IconFileAnalytics,
            initiallyOpened: true,
            links: [
                { label: t('nav.exam_list'), link: '/exams' },
                { label: t('nav.exam_create'), link: '/exams/new' },
                { label: t('nav.prediction'), link: '/prediction' },
            ],
        },
        {
            label: t('nav.student_management'),
            icon: IconCalendarStats,
            links: [
                { label: t('nav.student_list'), link: '/admin/students' },
            ],
        },
    ];

    const studentNav = [
        { label: t('nav.main'), icon: IconGauge, link: '/main' },
        {
            label: t('nav.exams'),
            icon: IconFileAnalytics,
            initiallyOpened: true,
            links: [
                { label: t('nav.exam_list'), link: '/exams' },
                { label: t('nav.prediction'), link: '/prediction' },
            ],
        },
        {
            label: t('nav.student'),
            icon: IconNotes,
            links: [
                { label: t('nav.my_results'), link: '/my-results' },
            ],
        },
        {
            label: t('nav.security'),
            icon: IconLock,
            links: [
                { label: t('nav.enable_2fa'), link: '/' },
                { label: t('nav.change_password'), link: '/' },
                { label: t('nav.recovery_codes'), link: '/' },
            ],
        },
    ];

    const links = isAdmin
        ? adminNav
        : isClient
            ? studentNav
            : [{ label: t('nav.main'), icon: IconGauge, link: '/main' }];

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
