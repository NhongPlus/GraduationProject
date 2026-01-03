import {
  SimpleGrid,
  Paper,
  Flex,
  BackgroundImage,
  Center,
  Text,
  Title,
  Box,
  PasswordInput,
  TextInput,
  Button,
  Anchor,
} from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import image from "@/assets/img/login.jpg"; // đảm bảo đường dẫn đúng
import classes from './Login.module.scss';
import ButtonBase from "@/components/Button/ButtonBase/ButtonBase";
import { IconLock } from '@tabler/icons-react';
import InputBase from "@/components/Input/InputBase/InputBase";
import { useTranslation } from "react-i18next";

function Login() {
  const { t } = useTranslation();

  return (
    <Center>
      <Paper shadow="md" mt="xl" radius="xl" maw={1100} > {/* mih để có chiều cao tối thiểu */}
        <SimpleGrid cols={2} h="100%">
          {/* Phần trái: Form login (bạn sẽ thêm sau) */}
          <Flex align="center" justify="center" py={24}>
            <Box w="100%" maw={400}>
              <Flex gap={12} my={36} direction={'column'}>
                <Title order={1} size="h1">
                  {t("login.title")}
                </Title>
                <Text>{t("login.subtitle")}</Text>
              </Flex>
              <Flex gap={12} direction={'column'} mb={24}>
                <InputBase
                  label={t("login.email")}
                  placeholder={t("login.email_placeholder")}
                />
                <InputBase
                  inputType="password"
                  label={t("login.password")}
                  placeholder={t("login.password_placeholder")}
                />
              </Flex>
              <ButtonBase
                label={t("login.submit")}
                fullWidth
                mb={24}
              />
              <Anchor underline="never">
                {t("login.forgot_password")}
              </Anchor>
            </Box>
          </Flex>

          {/* Phần phải: Hero Carousel với background */}
          <BackgroundImage src={image} py={30} classNames={{ root: classes.rootImage }}> {/* radius chỉ áp dụng desktop */}
            <Flex direction={'column'} >
              <Title order={1} pl={36} size="h1" mb={24}>
                 {t("login.hero_title")}
              </Title>
              <Box w="100%" pl={36}>
                <Carousel
                  withIndicators
                  withControls={false} // ẩn mũi tên nếu không cần
                  classNames={{
                    indicators: classes.indicators,   // khoảng cách indicators
                    indicator: classes.indicator,     // tùy chỉnh indicator nếu cần
                  }}

                >
                  {/* Slide 1 */}
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

                  {/* Thêm slide tùy ý */}
                </Carousel>
              </Box>
            </Flex>
          </BackgroundImage>
        </SimpleGrid>
      </Paper >
    </Center>
  );
}

export default Login;