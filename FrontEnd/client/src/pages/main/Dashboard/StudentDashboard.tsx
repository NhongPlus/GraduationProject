import { Box, Title, Group, Text } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import StatsSection from '@/components/StatsSection/StatsSection';
import UpcomingExamsTable from '@/components/UpcomingExamsTable/UpcomingExamsTable';
import PerformanceChart from '@/components/PerformanceChart/PerformanceChart';
import RecentResults from '@/components/RecentResults/RecentResults';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem('user_name') || 'Sinh viên';

  return (
    <Box className="max-w-[1400px] mx-auto flex flex-col gap-6 p-4">
      <Title order={2}>Chào mừng, {userName}!</Title>

      <Group mt="md" mb="md">
        <ButtonFilled color="blue" label="Xem danh sách bài thi" disabled={false} onClick={() => navigate('/exams')} />
        <ButtonFilled color="teal" label="Xem kết quả của tôi" disabled={false} onClick={() => navigate('/my-results')} />
        <ButtonFilled color="gray" label="Dự đoán điểm" disabled={false} onClick={() => navigate('/prediction')} />
      </Group>

      <StatsSection />

      <Box className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Box className="xl:col-span-2 flex flex-col gap-6">
          <UpcomingExamsTable />
          <PerformanceChart />
        </Box>
        <Box className="flex flex-col gap-6">
          <RecentResults />
        </Box>
      </Box>

      <Box>
        <Text mt="md" color="dimmed">
          Gợi ý: Truy cập Danh sách bài thi để bắt đầu làm bài, đến Kết quả để xem thành tích, và Dự đoán điểm để tham khảo thêm.
        </Text>
      </Box>
    </Box>
  );
};

export default StudentDashboard;
