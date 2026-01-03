import '@mantine/core/styles.css';
import '@mantine/carousel/styles.css';
import '@mantine/charts/styles.css';
import { MantineProvider } from '@mantine/core';
import { Layout } from './components/Layout/Layout';
import { BrowserRouter } from 'react-router-dom';
function App() {
  return (
    <MantineProvider>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </MantineProvider>
  )
}

export default App
