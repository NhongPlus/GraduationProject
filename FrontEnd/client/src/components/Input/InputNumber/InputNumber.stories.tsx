// eslint-disable-next-line storybook/no-renderer-packages
import type { Meta, StoryObj } from "@storybook/react";
import InputNumber from "./InputNumber";
import { IconArrowRight } from "@tabler/icons-react";

const meta: Meta<typeof InputNumber> = {
  title: "Input/NumberInput",
  component: InputNumber,
  args: {
    label: "Amount",
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

type Story = StoryObj<typeof InputNumber>;

export const Primary: Story = {
  args: {
    placeholder: "Enter amount",
    min: 0,
    max: 100,
    step: 1,
    fullWidth : true,
  },
};
