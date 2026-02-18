// eslint-disable-next-line storybook/no-renderer-packages
import type { Meta, StoryObj } from '@storybook/react';
import InputNativeSelect from './InputNativeSelect';
import { IconArrowRight } from '@tabler/icons-react';

const meta: Meta<typeof InputNativeSelect> = {
  title: 'Input/NativeSelect',
  component: InputNativeSelect,
  args: {
    label: 'NativeSelect Input',
  },

  decorators: [
    (Story) => (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof InputNativeSelect>;

export const Primary: Story = {
  args: {
    label: 'Choose framework',
    data: ["React", "Vue", "Angular"],
    clear: true,
  },
};
