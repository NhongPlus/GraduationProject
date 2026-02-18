import {
  SimpleGrid,
  Paper,
  Flex,
  BackgroundImage,
  Center,
  Text,
  Title,
  Box,
  Anchor,
} from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import image from "@/assets/img/login.jpg"; // đảm bảo đường dẫn đúng
import classes from './Login.module.scss';

import { IconLock } from '@tabler/icons-react';
import InputBase from "@/components/Input/InputBase/InputBase";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import demoAccounts from "@/mock/accounts";


function Login() {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    const found = demoAccounts.find(
      (acc) => acc.username === username && acc.password === password
    );
    if (found) {
      localStorage.setItem("access_token", "demo-token");
      window.location.reload();
    } else {
      setError("Sai tài khoản hoặc mật khẩu!");
    }
  };

  // Thêm hàm xử lý Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <Center>
      <Paper shadow="md" mt="6%" radius="xl" maw={1100}>
        <SimpleGrid cols={2} h="100%">
          {/* Phần trái: Form login */}
          <Flex align="center" justify="center" py={24}>
            <Box w="100%" maw={400} onKeyDown={handleKeyDown} tabIndex={0}>
              <Flex gap={12} my={36} direction={"column"}>
                <Title order={1} size="h1">
                  {t("login.title")}
                </Title>
                <Text>{t("login.subtitle")}</Text>
              </Flex>
              <Flex gap={12} direction={"column"} mb={24}>
                <InputBase
                  label={t("login.email")}
                  placeholder={t("login.email_placeholder")}
                  value={username}
                  onChange={(e: any) => setUsername(e.target.value)}
                />
                <InputBase
                  inputType="password"
                  label={t("login.password")}
                  placeholder={t("login.password_placeholder")}
                  value={password}
                  onChange={(e: any) => setPassword(e.target.value)}
                />
              </Flex>
              {error && (
                <Text color="red" size="sm" mb={8}>{error}</Text>
              )}
          
              <Anchor underline="never">
                {t("login.forgot_password")}
              </Anchor>
            </Box>
          </Flex>

          {/* Phần phải: Hero Carousel với background */}
          <BackgroundImage src={image} py={30} classNames={{ root: classes.rootImage }}>
            <Flex direction={"column"}>
              <Title order={1} pl={36} size="h1" mb={24}>
                {t("login.hero_title")}
              </Title>
              <Box w="100%" pl={36}>
                <Carousel
                  withIndicators
                  withControls={false}
                  classNames={{
                    indicators: classes.indicators,
                    indicator: classes.indicator,
                  }}
                >
                  <Carousel.Slide>
                    <Text size="lg" maw={500}>
                      Experience a seamless examination environment designed to help you focus on what matters most — your performance.
                    </Text>
                  </Carousel.Slide>
                  <Carousel.Slide>
                    <Text size="lg" maw={500}>
                      Add more slides with different messages here.
                    </Text>
                  </Carousel.Slide>
                </Carousel>
              </Box>
            </Flex>
          </BackgroundImage>
        </SimpleGrid>
      </Paper>
    </Center>
  );
}

export default Login;