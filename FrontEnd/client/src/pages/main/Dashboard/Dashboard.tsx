import { Box, Flex } from '@mantine/core';
import StatsSection from '@/components/StatsSection/StatsSection';
import UpcomingExamsTable from '@/components/UpcomingExamsTable/UpcomingExamsTable';
import PerformanceChart from '@/components/PerformanceChart/PerformanceChart';
import RecentResults from '@/components/RecentResults/RecentResults';

function Dashboard() {
    return (
        <Flex gap={20} direction="column" className="max-w-[1400px] mx-auto flex flex-col gap-6">
            <StatsSection />

            <Flex gap={20} direction="column" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Flex gap={20} direction="column" className="xl:col-span-2 flex flex-col gap-6">
                    <UpcomingExamsTable />
                    <PerformanceChart />
                </Flex>

                <Box className="flex flex-col gap-6">
                    <RecentResults />
                </Box>
            </Flex>
        </Flex>
    );
}

export default Dashboard;