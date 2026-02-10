import { AppShell, Burger, Group, Title, Text, Button, Card, SimpleGrid, Badge } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBallBasketball, IconChartBar } from '@tabler/icons-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Фейковые данные для графика
const data = [
  { name: 'Матч 1', points: 88 },
  { name: 'Матч 2', points: 102 },
  { name: 'Матч 3', points: 96 },
  { name: 'Матч 4', points: 115 },
  { name: 'Матч 5', points: 99 },
];

export default function App() {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <IconBallBasketball size={32} color="orange" />
          <Title order={3} c="orange">HoopStat AI</Title>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Text size="sm" c="dimmed" mb="md">МЕНЮ</Text>
        <Button variant="light" fullWidth justify="flex-start" leftSection={<IconChartBar />}>
          Дашборд
        </Button>
        <Button variant="subtle" fullWidth justify="flex-start" mt="xs">
          Команды
        </Button>
        <Button variant="subtle" fullWidth justify="flex-start" mt="xs">
          AI Прогнозы
        </Button>
      </AppShell.Navbar>

      <AppShell.Main>
        <Title order={2} mb="lg">Обзор лиги</Title>

        <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text fw={500}>Всего матчей</Text>
            <Title order={1}>124</Title>
            <Badge color="green" mt="md">+12% за неделю</Badge>
          </Card>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text fw={500}>Ср. очков за игру</Text>
            <Title order={1}>108.5</Title>
            <Badge color="orange" mt="md">Высокий темп</Badge>
          </Card>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text fw={500}>Точность AI</Text>
            <Title order={1} c="blue">87%</Title>
            <Text size="xs" c="dimmed">Последние 50 игр</Text>
          </Card>
        </SimpleGrid>

        <Card shadow="sm" padding="lg" radius="md" withBorder h={400}>
          <Title order={4} mb="md">Динамика результативности (Сезон 2026)</Title>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#373A40" />
              <XAxis dataKey="name" stroke="#909296" />
              <YAxis stroke="#909296" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1A1B1E', borderColor: '#373A40' }}
                itemStyle={{ color: 'orange' }}
              />
              <Area type="monotone" dataKey="points" stroke="#ff8c00" fill="rgba(255, 140, 0, 0.2)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

      </AppShell.Main>
    </AppShell>
  );
}
