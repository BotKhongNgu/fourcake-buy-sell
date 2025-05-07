import React, { useState, useEffect, useRef, useMemo, useContext } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import _, { round } from 'lodash';
import {
  Card,
  Input,
  Button,
  Form,
  Typography,
  Space,
  Row,
  Col,
  message,
  Modal,
  Radio,
  Select,
  InputNumber,
  Table,
  Tag,
  Switch,
  Badge,
  Dropdown,
  Upload,
  Popconfirm,
  Spin
} from 'antd';
import {
  KeyOutlined,
  PlayCircleOutlined,
  StopOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
  MenuOutlined,
  DownloadOutlined,
  CaretRightOutlined,
  UploadOutlined,
  DollarOutlined,
  DownOutlined,
  PoweroffOutlined,
  CheckOutlined
} from '@ant-design/icons';
import type { InputRef, GetRef } from 'antd';
import dayjs from 'dayjs';
import { Account, db } from '@renderer/services/db';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

// ===== Editable Table Context & Components =====
type FormInstance<T> = GetRef<typeof Form<T>>;
const EditableContext = React.createContext<FormInstance<any> | null>(null);

interface EditableRowProps {
  index: number;
}

const EditableRow: React.FC<EditableRowProps> = ({ index, ...props }) => {
  const [form] = Form.useForm();
  return (
    <Form form={form} component={false}>
      <EditableContext.Provider value={form}>
        <tr {...props} />
      </EditableContext.Provider>
    </Form>
  );
};

// Kết hợp Sortable và Editable
const SortableEditableRow = ({ children, ...props }: any) => {
  const [form] = Form.useForm();
  const { setNodeRef, transform, transition, isDragging } = useSortable({
    id: props['data-row-key']
  });

  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging
      ? {
          position: 'relative',
          zIndex: 9999,
          backgroundColor: 'rgba(24, 144, 255, 0.1)',
          boxShadow: '0 3px 6px rgba(0, 0, 0, 0.15)'
        }
      : {})
  };

  return (
    <Form form={form} component={false}>
      <EditableContext.Provider value={form}>
        <tr
          {...props}
          ref={setNodeRef}
          style={style}
          className={isDragging ? 'editable-row dragging' : 'editable-row'}
        >
          {children}
        </tr>
      </EditableContext.Provider>
    </Form>
  );
};

interface EditableCellProps {
  title: React.ReactNode;
  editable: boolean;
  children: React.ReactNode;
  dataIndex: string;
  record: any;
  handleSave: (record: any) => void;
  inputType?: 'text' | 'select' | 'number';
  options?: { value: string; label: string }[];
}

const EditableCell: React.FC<EditableCellProps> = ({
  title,
  editable,
  children,
  dataIndex,
  record,
  handleSave,
  inputType = 'text',
  options = [],
  ...restProps
}) => {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<InputRef>(null);
  const selectRef = useRef<any>(null);
  const form = useContext(EditableContext)!;

  useEffect(() => {
    if (editing) {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [editing]);

  const toggleEdit = () => {
    setEditing(!editing);
    form.setFieldsValue({ [dataIndex]: record[dataIndex] });
  };

  const save = async () => {
    try {
      const values = await form.validateFields();
      toggleEdit();
      handleSave({ ...record, ...values });
    } catch (errInfo) {
      console.log('Lưu thất bại:', errInfo);
    }
  };

  let childNode = children;

  if (editable) {
    childNode = editing ? (
      <Form.Item
        style={{ margin: 0 }}
        name={dataIndex}
        rules={[{ required: true, message: `${title} là bắt buộc.` }]}
      >
        {inputType === 'text' && <Input ref={inputRef} onPressEnter={save} onBlur={save} />}
        {inputType === 'select' && (
          <Select
            ref={selectRef}
            style={{ width: '100%' }}
            onBlur={save}
            options={options}
            onChange={save}
          />
        )}
        {inputType === 'number' && (
          <InputNumber
            ref={inputRef as any}
            onPressEnter={save}
            onBlur={save}
            style={{ width: '100%' }}
            formatter={(value) => {
              if (value === undefined || value === null) return '';
              const parts = value.toString().split('.');
              const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
              return parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
            }}
            parser={(value: string | undefined) => {
              if (!value) return 0;
              return parseFloat(value.replace(/\$\s?|(,*)/g, '')) || 0;
            }}
          />
        )}
      </Form.Item>
    ) : (
      <div
        className="editable-cell-value-wrap"
        style={{ paddingRight: 24 }}
        onClick={(e) => {
          // Ngăn sự kiện bubbling lên tới hàng (row)
          e.stopPropagation();
          toggleEdit();
        }}
      >
        {children}
      </div>
    );
  }

  return <td {...restProps}>{childNode}</td>;
};

// CSS cho thanh cuộn
const scrollbarStyle = {
  userSelect: 'text' as const,
  WebkitUserSelect: 'text' as const,
  MozUserSelect: 'text' as const,
  msUserSelect: 'text' as const
};

// CSS toàn cục cho header bảng và style khác
const globalStyle = document.createElement('style');
globalStyle.innerHTML = `
  .ant-table-column-title {
    font-weight: 700;
  }

  /* Style cho Switch Mua/Bán (class type-switch) */
  /* Chế độ Mua - khi switch được checked */
  .type-switch.ant-switch.ant-switch-checked {
    background-color: #52c41a !important;


  }

  /* Để tương thích với Ant Design 5 */
  :where(.css-dev-only-do-not-override-ph9edi).type-switch.ant-switch.ant-switch-checked {
    background-color: #52c41a !important;


  }

  /* Để tương thích với Ant Design 4 */
  .type-switch.ant-switch-checked {
    background-color: #52c41a !important;
  }

  .type-switch.ant-switch.ant-switch-checked:hover {
    background-color: #389e0d !important;
    box-shadow: 0 0 8px rgba(82, 196, 26, 0.7) !important;
  }

  .type-switch.ant-switch.ant-switch-checked .ant-switch-inner {
    color: white !important;
    font-weight: bold;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2) !important;
  }

  /* Chế độ Bán - khi switch không được checked */
  .type-switch.ant-switch:not(.ant-switch-checked) {
    background-color: #ff4d4f !important;
    box-shadow: 0 0 5px rgba(255, 77, 79, 0.5) !important;


  }

  /* Để tương thích với Ant Design 5 */
  :where(.css-dev-only-do-not-override-ph9edi).type-switch.ant-switch:not(.ant-switch-checked) {
    background-color: #ff4d4f !important;
    box-shadow: 0 0 5px rgba(255, 77, 79, 0.5) !important;


  }

  .type-switch.ant-switch:not(.ant-switch-checked):hover {
    background-color: #cf1322 !important;
    box-shadow: 0 0 8px rgba(255, 77, 79, 0.7) !important;
  }

  .type-switch.ant-switch:not(.ant-switch-checked) .ant-switch-inner {
    color: white !important;
    font-weight: bold;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2) !important;
  }

  /* Đảm bảo kích thước chữ phù hợp */
  .type-switch.ant-switch .ant-switch-inner {
    font-size: 12px;
  }

  /* Style cho drag handle */
  .drag-handle {
    cursor: grab !important;
    transition: color 0.3s;
    padding: 8px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .drag-handle:hover {
    color: #1890ff !important;
    background-color: rgba(24, 144, 255, 0.1);
  }

  .drag-handle:active {
    cursor: grabbing !important;
    color: #096dd9 !important;
    background-color: rgba(24, 144, 255, 0.2);
  }

  /* Style cho hàng đang kéo */
  .editable-row.dragging {
    background-color: rgba(24, 144, 255, 0.1);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
    z-index: 9999;
  }
`;
document.head.appendChild(globalStyle);

// Component cho nút kéo thả
const DragHandle = ({ rowId }: { rowId: string | number }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: rowId
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="drag-handle"
      style={{
        padding: '4px',
        cursor: isDragging ? 'grabbing' : 'grab',
        backgroundColor: isDragging ? 'rgba(24, 144, 255, 0.2)' : 'transparent'
      }}
    >
      <MenuOutlined style={{ color: isDragging ? '#096dd9' : '#999' }} />
    </div>
  );
};

const BotControl: React.FC = () => {
  // =============== STATE DECLARATIONS ===============
  const [form] = Form.useForm();
  const [modalForm] = Form.useForm();
  const [minDelay, setMinDelay] = useState<any>(1);
  const [maxDelay, setMaxDelay] = useState<any>(1);
  const [tokenAddress, setTokenAddress] = useState<string>('');
  const [slippage, setSlippage] = useState<any>(1);
  const [networkType, setNetworkType] = useState<'MAINNET' | 'TESTNET'>('MAINNET');
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [inputType, setInputType] = useState<'recovery' | 'privateKey'>('recovery');
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [editingKey, setEditingKey] = useState<number>(-1);
  const [amountType, setAmountType] = useState<'25' | '50' | '75' | '100' | 'custom'>('custom');
  const [editingAmountId, setEditingAmountId] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const customAmountRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Thêm state cho chế độ chạy đồng thời hay tuần tự
  const [runMode, setRunMode] = useState<'sequential' | 'concurrent'>('sequential');

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [lastBuyPrice, setLastBuyPrice] = useState<number>(0);
  const [lastSellPrice, setLastSellPrice] = useState<number>(Infinity);
  const [currentAccountId, setCurrentAccountId] = useState<number>(-1);

  // Refs
  const isRunningRef = useRef<boolean>(false);
  const lastBuyPriceRef = useRef<number>(0);
  const lastSellPriceRef = useRef<number>(Infinity);
  const countdownRef = useRef<number>(0);
  const tableRef = useRef<any>(null); // Thêm ref cho bảng tài khoản

  // Thêm ref cho chế độ chạy
  const runModeRef = useRef<'sequential' | 'concurrent'>('sequential');

  // Database queries
  const accounts = useLiveQuery(() => db.accounts.orderBy('sortOrder').toArray()) || [];

  const logs = useLiveQuery(() => db.logs.limit(1000).reverse().toArray()) || [];

  // Thêm state và ref cho việc sắp xếp
  const [sortedAccounts, setSortedAccounts] = useState<Account[]>([]);
  const sortedAccountsRef = useRef<Account[]>([]);

  // Cập nhật sortedAccounts khi accounts thay đổi
  useEffect(() => {
    const sorted = [...accounts].sort((a, b) => a.sortOrder - b.sortOrder);
    setSortedAccounts(sorted);
    sortedAccountsRef.current = sorted;
  }, [accounts]);

  // Thêm sensors cho drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Tăng mức độ nhạy và chỉ kích hoạt khi di chuyển nhiều hơn
      activationConstraint: {
        distance: 5,
        tolerance: 5,
        delay: 100
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Xử lý sự kiện kết thúc kéo thả
  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over) return;

    console.log('Drag end event:', { active: active.id, over: over.id });

    if (active.id !== over.id) {
      try {
        // Tìm vị trí cũ và mới trong danh sách tài khoản
        const oldIndex = sortedAccounts.findIndex((item) => item.id === active.id);
        const newIndex = sortedAccounts.findIndex((item) => item.id === over.id);

        if (oldIndex === -1 || newIndex === -1) {
          console.error('Không tìm thấy vị trí phù hợp trong mảng tài khoản', {
            oldIndex,
            newIndex
          });
          return;
        }

        console.log('Di chuyển từ vị trí', oldIndex, 'đến', newIndex);

        // Cập nhật mảng sắp xếp
        const newSortedAccounts = arrayMove(sortedAccounts, oldIndex, newIndex);
        setSortedAccounts(newSortedAccounts);

        // Cập nhật sortOrder trong database
        for (let i = 0; i < newSortedAccounts.length; i++) {
          await db.accounts.update(newSortedAccounts[i].id, {
            sortOrder: i
          });
        }

        message.success(
          `Đã di chuyển tài khoản từ vị trí ${oldIndex + 1} đến vị trí ${newIndex + 1}`
        );
      } catch (error) {
        console.error('Lỗi khi di chuyển tài khoản:', error);
        message.error('Không thể di chuyển tài khoản');
      }
    }
  };

  // =============== SETTINGS MANAGEMENT ===============
  // Đọc cài đặt từ bảng settings khi component được tải
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const tokenAddressSetting = await db.settings.get('tokenAddress');
        const minDelaySetting = await db.settings.get('minDelay');
        const maxDelaySetting = await db.settings.get('maxDelay');
        const slippageSetting = await db.settings.get('slippage');
        const networkTypeSetting = await db.settings.get('networkType');
        const runModeSetting = await db.settings.get('runMode');

        if (tokenAddressSetting) {
          setTokenAddress(tokenAddressSetting.value);
        }

        if (minDelaySetting) {
          setMinDelay(minDelaySetting.value);
        }

        if (maxDelaySetting) {
          setMaxDelay(maxDelaySetting.value);
        }

        if (slippageSetting) {
          setSlippage(slippageSetting.value);
        }

        if (networkTypeSetting) {
          setNetworkType(networkTypeSetting.value);
        }

        if (runModeSetting) {
          setRunMode(runModeSetting.value);
          runModeRef.current = runModeSetting.value;
        }
      } catch (error) {
        console.error('Lỗi khi đọc cài đặt:', error);
      }
    };

    loadSettings();
  }, []);

  // Lưu cài đặt vào bảng settings
  const saveSettings = async () => {
    try {
      await db.settings.put({ key: 'tokenAddress', value: tokenAddress });
      await db.settings.put({ key: 'minDelay', value: minDelay });
      await db.settings.put({ key: 'maxDelay', value: maxDelay });
      await db.settings.put({ key: 'slippage', value: slippage });
      await db.settings.put({ key: 'networkType', value: networkType });
      await db.settings.put({ key: 'runMode', value: runMode });
      message.success('Đã lưu cài đặt');
    } catch (error) {
      console.error('Lỗi khi lưu cài đặt:', error);
      message.error('Không thể lưu cài đặt');
    }
  };

  // =============== ACCOUNT MANAGEMENT ===============
  // Hiển thị modal thêm ví mới
  const showModal = () => {
    setEditingAccount(null);
    setIsModalVisible(true);
  };

  // Hiển thị modal chỉnh sửa ví
  const showEditModal = (account: any) => {
    setEditingAccount(account);
    modalForm.setFieldsValue({
      name: account.name,
      type: account.type,
      amountIn: account.amountIn,
      tokenAddress: account.tokenAddress,
      cycle: account.cycle
    });
    setIsModalVisible(true);
  };

  // Đóng modal
  const handleModalCancel = () => {
    setIsModalVisible(false);
    modalForm.resetFields();
    setEditingAccount(null);
  };

  // Xử lý khi nhấn OK trên modal
  const handleModalOk = () => {
    modalForm.validateFields().then(async (values) => {
      if (editingAccount) {
        // Cập nhật ví hiện có
        await db.accounts.update(editingAccount.id, {
          name: values.name,
          type: values.type,
          amountIn: parseFloat(values.amountIn),
          unit: values.unit || 'value',
          tokenAddress: tokenAddress,
          cycle: values.cycle || 0,
          updatedAt: new Date()
        });
        message.success('Đã cập nhật ví');
      } else {
        if (tokenAddress === '') {
          message.error('Vui lòng nhập địa chỉ token');
          return;
        }

        try {
          // Lấy số lượng tài khoản hiện tại để xác định sortOrder
          const accountCount = await db.accounts.count();

          // Xử lý amountType nếu không phải là custom
          let finalAmount = parseFloat(values.amountIn);
          let finalUnit = values.unit || 'value';

          if (values.amountType && values.amountType !== 'custom') {
            finalAmount = parseInt(values.amountType);
            finalUnit = 'percent';
          }

          // Thêm ví mới
          const newAccount = {
            id: Date.now(),
            privateKey: values.privateKey || '',
            createdAt: new Date(),
            updatedAt: new Date(),
            name: values.name || `Wallet ${accountCount + 1}`,
            balance: 0,
            address: '', // Sẽ được tính toán từ private key
            isActive: 1,
            type: values.type,
            status: 'pending' as 'placing' | 'pending' | 'failed',
            amountIn: finalAmount,
            unit: finalUnit,
            waitFrom: parseInt(minDelay),
            waitTo: parseInt(maxDelay),
            bnbBalance: 0,
            tokenBalance: 0,
            tokenAddress: tokenAddress,
            sortOrder: accountCount // Gán sortOrder bằng số lượng tài khoản (thêm vào cuối)
          };

          const walletResponse = await window.electron.ipcRenderer.invoke(
            'create-wallet',
            values.recoveryPhrase || values.privateKey,
            inputType
          );

          if (!walletResponse.success) {
            throw new Error(
              walletResponse.errorMessage ||
                walletResponse.errorCode ||
                'Lỗi không xác định khi tạo ví'
            );
          }

          const balanceResponse = await window.electron.ipcRenderer.invoke(
            'get-balance',
            walletResponse.data.privateKey,
            tokenAddress,
            networkType
          );

          if (!balanceResponse.success) {
            throw new Error(
              balanceResponse.errorMessage ||
                balanceResponse.errorCode ||
                'Lỗi không xác định khi lấy số dư'
            );
          }

          const dataToAdd = {
            ...newAccount,
            privateKey: walletResponse.data.privateKey,
            address: walletResponse.data.address,
            status: 'pending' as 'placing' | 'pending' | 'failed',
            bnbBalance: balanceResponse.data.bnbBalance,
            tokenBalance: balanceResponse.data.tokenBalance,
            cycle: 0,
            currentCycle: 0
          } as Account;

          await db.accounts.add(dataToAdd);
          message.success('Đã thêm ví mới');
        } catch (error) {
          console.error('Lỗi khi thêm ví:', error);
          message.error('Không thể thêm ví. Vui lòng kiểm tra lại thông tin.');
          return;
        }
      }

      setIsModalVisible(false);
      modalForm.resetFields();
      setEditingAccount(null);
    });
  };

  // Xóa ví
  const handleDeleteAccount = (id: number) => {
    db.accounts.delete(id);
    message.success('Đã xóa ví');
  };

  // Bật/tắt ví
  const handleToggleActive = (id: number, isActive: boolean) => {
    db.accounts.update(id, { isActive: isActive ? 1 : 0 });
    message.success(`Đã ${isActive ? 'bật' : 'tắt'} ví`);
  };

  // =============== BOT CONTROL FUNCTIONS ===============
  // Bắt đầu chạy bot
  const onStart = async () => {
    try {
      // Kiểm tra các trường bắt buộc
      if (accounts.length === 0) {
        message.error('Vui lòng thêm ít nhất một ví');
        return;
      }

      if (!tokenAddress.trim()) {
        message.error('Vui lòng nhập địa chỉ token');
        return;
      }

      if (minDelay === null || maxDelay === null) {
        message.error('Vui lòng nhập thời gian chờ');
        return;
      }

      // Kiểm tra trạng thái IPC
      const ipcStatus = window.api.checkIpcStatus();
      if (!ipcStatus.available) {
        throw new Error(`Không thể bắt đầu bot: ${ipcStatus.message}`);
      }

      // Reset currentCycle về 0 cho tất cả tài khoản active
      await db.accounts.bulkUpdate(
        accounts?.map((account) => ({
          key: account.id,
          changes: { currentCycle: 0 }
        })) || []
      );
      // Lưu cài đặt trước khi bắt đầu
      saveSettings();

      // Cập nhật cả state và ref
      setIsRunning(true);
      isRunningRef.current = true;
      runModeRef.current = runMode;

      // Start power save blocker to prevent app suspension
      try {
        const result = await window.api.startPowerSaveBlocker();
        console.log('Power save blocker started:', result);

        await db.logs.add({
          createdAt: new Date(),
          updatedAt: new Date(),
          message: `Đã kích hoạt chế độ ngăn chặn tạm dừng ứng dụng`
        });
      } catch (error) {
        console.error('Failed to start power save blocker:', error);
      }

      // Kiểm tra IPC connection
      if (!window.electron || !window.electron.ipcRenderer) {
        throw new Error('Kết nối IPC không khả dụng');
      }

      // Thông báo cho main process rằng bot đã bắt đầu
      try {
        const response = await window.api.startBot(accounts, tokenAddress);

        if (!response.success) {
          throw new Error(
            `Không thể bắt đầu bot: ${response.errorMessage || response.errorCode || 'Lỗi không xác định'}`
          );
        }
      } catch (error: any) {
        console.warn('Cảnh báo khi gọi startBot:', error);
        // Tiếp tục thực thi ngay cả khi có lỗi từ main process
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Sử dụng window.api.addLog thay vì db.logs.add
      await window.api.addLog(
        `Bắt đầu chạy ở chế độ ${runMode === 'concurrent' ? 'đồng thời' : 'tuần tự'}`
      );

      if (runMode === 'concurrent') {
        await runConcurrently();
      } else {
        await checkAndPlaceOrder();
      }

      // Cập nhật cả state và ref khi kết thúc
      setIsRunning(false);
      isRunningRef.current = false;

      // Stop power save blocker
      try {
        const result = await window.api.stopPowerSaveBlocker();
        console.log('Power save blocker stopped:', result);

        await db.logs.add({
          createdAt: new Date(),
          updatedAt: new Date(),
          message: `Đã tắt chế độ ngăn chặn tạm dừng ứng dụng`
        });
      } catch (error) {
        console.error('Failed to stop power save blocker:', error);
      }

      // Thông báo cho main process rằng bot đã dừng
      try {
        if (window.electron && window.electron.ipcRenderer) {
          await window.api.stopBot();
        }
      } catch (error) {
        console.error('Lỗi khi dừng bot từ main process:', error);
      }

      // Sử dụng window.api.addLog thay vì db.logs.add
      await window.api.addLog('Bot đã dừng');
    } catch (error: any) {
      // Xử lý lỗi trong quá trình chạy bot
      console.error('Lỗi khi chạy bot:', error);

      // Cập nhật trạng thái
      setIsRunning(false);
      isRunningRef.current = false;

      // Ghi log lỗi
      const errorMessage = error?.message || 'Lỗi không xác định';
      await window.api.addLog(`Lỗi: ${errorMessage}`);

      // Hiển thị thông báo lỗi
      message.error(`Đã xảy ra lỗi: ${errorMessage}`);
    }
  };

  // Dừng bot
  const onStop = async () => {
    try {
      // Cập nhật cả state và ref
      setIsRunning(false);
      isRunningRef.current = false;

      // Stop power save blocker
      try {
        const result = await window.api.stopPowerSaveBlocker();
        console.log('Power save blocker stopped:', result);

        await db.logs.add({
          createdAt: new Date(),
          updatedAt: new Date(),
          message: `Đã tắt chế độ ngăn chặn tạm dừng ứng dụng`
        });
      } catch (error) {
        console.error('Failed to stop power save blocker:', error);
      }

      // Thông báo cho main process
      if (window.electron && window.electron.ipcRenderer) {
        window.api.stopBot().catch((error) => {
          console.error('Lỗi khi gọi stopBot:', error);
        });
      }

      // Ghi log
      window.api.addLog('Bot đã được dừng thủ công');
    } catch (error: any) {
      console.error('Lỗi trong hàm onStop:', error);
      const errorMessage = error?.message || 'Lỗi không xác định';

      // Ghi log lỗi
      window.api.addLog(`Lỗi khi dừng bot: ${errorMessage}`);
    }
  };

  // Thêm hàm chạy đồng thời tất cả các tài khoản
  const runConcurrently = async () => {
    try {
      while (isRunningRef.current) {
        try {
          // Cập nhật lại danh sách tài khoản mới nhất
          const processableAccounts = await db.accounts
            .where('isActive')
            .equals(1)
            .and((account) => account.cycle === 0 || account.currentCycle < account.cycle)
            .toArray();

          if (processableAccounts.length === 0) {
            // Không có tài khoản active nào
            await window.api.addLog(`Không có tài khoản nào thỏa điều kiện chạy bot.`);
            isRunningRef.current = false;
            setIsRunning(false);
            break;
          }

          // Tạo một mảng các Promise để xử lý mỗi tài khoản độc lập cho tất cả các vòng lặp
          const accountPromises = processableAccounts.map((account) =>
            (async () => {
              // Xử lý tài khoản này cho tất cả các vòng lặp còn lại
              let currentAccount = { ...account };

              while (isRunningRef.current) {
                try {
                  // Ghi log tài khoản hiện tại
                  await window.api.addLog(
                    `Đang xử lý tài khoản: ${currentAccount.name} (ID: ${currentAccount.id}) - Vòng chạy: ${currentAccount.currentCycle + 1}/${currentAccount.cycle === 0 ? '∞' : currentAccount.cycle}`
                  );

                  // Cập nhật trạng thái ví
                  await db.accounts.update(currentAccount.id, { status: 'placing' });

                  if (currentAccount.type == 'buy') {
                    await placeBuyOrder(currentAccount, currentAccount.amountIn.toString());
                  } else {
                    await placeSellOrder(currentAccount, currentAccount.amountIn.toString());
                  }

                  // Lấy thông tin tài khoản mới nhất từ database để đảm bảo có thông tin cycle và currentCycle mới nhất
                  // (trong trường hợp đã được cập nhật bởi placeBuyOrder/placeSellOrder khi gặp lỗi INVALID_AMOUNT)
                  const updatedAccount = await db.accounts.get(currentAccount.id);

                  // Cập nhật lại đối tượng currentAccount trong bộ nhớ với dữ liệu mới nhất
                  if (updatedAccount) {
                    currentAccount.cycle = updatedAccount.cycle;
                    currentAccount.currentCycle = updatedAccount.currentCycle;
                  }

                  // Nếu không phải lỗi INVALID_AMOUNT (đã được xử lý trong placeBuyOrder/placeSellOrder)
                  // thì tăng số vòng chạy hiện tại
                  if (currentAccount.cycle !== 1 || currentAccount.currentCycle !== 1) {
                    // Tăng số vòng chạy hiện tại của tài khoản
                    currentAccount.currentCycle += 1;

                    await db.accounts.update(currentAccount.id, {
                      currentCycle: currentAccount.currentCycle
                    });
                  }

                  // Kiểm tra xem đã hoàn thành đủ số vòng chạy chưa
                  if (
                    (currentAccount.cycle > 0 &&
                      currentAccount.currentCycle >= currentAccount.cycle) ||
                    !isRunningRef.current
                  ) {
                    break;
                  }

                  // Nếu bot vẫn chạy, chờ thời gian trước khi tài khoản này bắt đầu vòng mới

                  const waitTime = _.random(minDelay, maxDelay);

                  await window.api.addLog(
                    `Tài khoản ${currentAccount.name} (ID: ${currentAccount.id}) hoàn thành vòng ${currentAccount.currentCycle}/${currentAccount.cycle === 0 ? '∞' : currentAccount.cycle}. Đợi ${waitTime} giây trước khi tiếp tục`
                  );

                  await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
                } catch (error: any) {
                  console.error(`Lỗi khi xử lý tài khoản ${currentAccount.id}:`, error);
                  // Ghi log lỗi
                  await window.api.addLog(
                    `Lỗi khi xử lý tài khoản ${currentAccount.id}: ${error.message || 'Lỗi không xác định'}`
                  );

                  // Cập nhật trạng thái ví và tăng số vòng chạy
                  await db.accounts.update(currentAccount.id, {
                    status: 'failed',
                    currentCycle: currentAccount.currentCycle + 1
                  });

                  currentAccount.currentCycle += 1;
                  // Nếu vẫn còn vòng chạy thì đợi một chút rồi tiếp tục
                  if (
                    currentAccount.currentCycle >= currentAccount.cycle ||
                    !isRunningRef.current
                  ) {
                    break;
                  }
                }
              }
            })()
          );

          // Chờ tất cả các tài khoản hoàn thành xử lý
          await Promise.all(accountPromises);
        } catch (error: any) {
          // Xử lý lỗi trong vòng lặp
          console.error('Lỗi trong quá trình chạy đồng thời:', error);
          await window.api.addLog(`Lỗi chu kỳ: ${error.message || 'Lỗi không xác định'}`);
        }
      }
    } catch (error: any) {
      // Xử lý lỗi tổng thể
      console.error('Lỗi nghiêm trọng trong runConcurrently:', error);
      await window.api.addLog(`Lỗi nghiêm trọng: ${error.message || 'Lỗi không xác định'}`);

      // Đảm bảo dừng bot
      isRunningRef.current = false;
      setIsRunning(false);
    }
  };

  // Hàm cập nhật countdown
  const updateCountdown = (seconds: number) => {
    setCountdown(seconds);
    countdownRef.current = seconds;
  };

  // Kiểm tra và đặt lệnh
  const checkAndPlaceOrder = async () => {
    let index = 0;
    let cachedAccounts: any[] = [];

    while (isRunningRef.current) {
      // Nếu chưa có danh sách tài khoản hoặc danh sách đã hết, cập nhật lại danh sách mới
      if (cachedAccounts.length === 0) {
        // Cập nhật lại danh sách tài khoản mới nhất
        const activeAccounts = await db.accounts
          .where('isActive')
          .equals(1)
          .and((account) => account.cycle === 0 || account.currentCycle < account.cycle)
          .toArray();

        cachedAccounts = [...activeAccounts].sort((a, b) => a.sortOrder - b.sortOrder);
        index = 0;

        if (cachedAccounts.length === 0) {
          await window.api.addLog(`Không có tài khoản nào thỏa điều kiện chạy bot.`);
          isRunningRef.current = false;
          setIsRunning(false);
          break;
        }
      }

      // Lấy tài khoản theo index
      const currentAccount = cachedAccounts[index];
      // Kiểm tra xem currentAccount có tồn tại không trước khi truy cập thuộc tính id
      if (!currentAccount) {
        console.error('Không tìm thấy tài khoản tại index:', index);
        await window.api.addLog(`Lỗi: Không tìm thấy tài khoản tại vị trí ${index}`);

        // Đặt lại index về 0 và tiếp tục vòng lặp
        index = 0;
        continue;
      }

      setCurrentAccountId(currentAccount.id);

      // Kiểm tra xem tài khoản có đáp ứng điều kiện cycle không
      if (currentAccount.cycle > 0 && currentAccount.currentCycle >= currentAccount.cycle) {
        await db.logs.add({
          createdAt: new Date(),
          updatedAt: new Date(),
          message: `[${new Date().toLocaleTimeString()}] Bỏ qua tài khoản ${currentAccount.name} (ID: ${currentAccount.id}) vì đã đạt số vòng chạy tối đa: ${currentAccount.currentCycle}/${currentAccount.cycle}`
        });

        // Xóa tài khoản này khỏi mảng đã cache
        cachedAccounts.splice(index, 1);

        // Không tăng index vì mảng đã giảm 1 phần tử
        if (index >= cachedAccounts.length) {
          index = 0;
        }

        continue;
      }

      // Ghi log tài khoản hiện tại
      await db.logs.add({
        createdAt: new Date(),
        updatedAt: new Date(),
        message: `[${new Date().toLocaleTimeString()}] Đang xử lý tài khoản: ${currentAccount.name} (ID: ${currentAccount.id}) - Vòng chạy: ${currentAccount.currentCycle + 1}/${currentAccount.cycle === 0 ? '∞' : currentAccount.cycle}`
      });

      // Cập nhật trạng thái ví
      await db.accounts.update(currentAccount.id, { status: 'placing' });

      if (currentAccount.type == 'buy') {
        await placeBuyOrder(currentAccount, currentAccount.amountIn.toString());
      } else {
        await placeSellOrder(currentAccount, currentAccount.amountIn.toString());
      }

      // Lấy thông tin tài khoản mới nhất từ database để đảm bảo có thông tin cycle và currentCycle mới nhất
      // (trong trường hợp đã được cập nhật bởi placeBuyOrder/placeSellOrder khi gặp lỗi INVALID_AMOUNT)
      const updatedAccount = await db.accounts.get(currentAccount.id);

      // Cập nhật lại đối tượng currentAccount trong bộ nhớ với dữ liệu mới nhất
      if (updatedAccount) {
        currentAccount.cycle = updatedAccount.cycle;
        currentAccount.currentCycle = updatedAccount.currentCycle;
        // Cập nhật lại trong cache
        cachedAccounts[index] = {
          ...cachedAccounts[index],
          cycle: updatedAccount.cycle,
          currentCycle: updatedAccount.currentCycle
        };
      }

      // Nếu không phải lỗi INVALID_AMOUNT (đã được xử lý trong placeBuyOrder/placeSellOrder)
      // thì tăng số vòng chạy hiện tại trong cả DB và cache
      if (currentAccount.cycle !== 1 || currentAccount.currentCycle !== 1) {
        const newCycle = currentAccount.currentCycle + 1;
        await db.accounts.update(currentAccount.id, {
          currentCycle: newCycle
        });

        // Cập nhật giá trị trong cache
        currentAccount.currentCycle = newCycle;
        cachedAccounts[index].currentCycle = newCycle;
      }

      // Kiểm tra nếu tài khoản đã đạt đến giới hạn cycle sau khi cập nhật
      if (currentAccount.cycle > 0 && currentAccount.currentCycle + 1 >= currentAccount.cycle) {
        cachedAccounts.splice(index, 1);
      } else {
        // Tăng index chỉ khi không xóa phần tử
        index = (index + 1) % cachedAccounts.length;
      }

      // Kiểm tra kết quả và chờ thời gian trước khi tiếp tục
      const waitTime = _.random(minDelay, maxDelay);
      updateCountdown(waitTime);

      await db.logs.add({
        createdAt: new Date(),
        updatedAt: new Date(),
        message: `[${new Date().toLocaleTimeString()}] Đợi ${waitTime} giây để tiếp tục`
      });

      // Bắt đầu đếm ngược
      for (let i = waitTime; i >= 0; i--) {
        if (!isRunningRef.current) break;
        updateCountdown(i);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  };

  // Đặt lệnh mua
  const placeBuyOrder = async (account: any, amount: string) => {
    try {
      // Kiểm tra xem window.electron và ipcRenderer có tồn tại không
      if (!window.electron || !window.electron.ipcRenderer) {
        throw new Error('IPC renderer không khả dụng');
      }

      // Gọi hàm đặt lệnh mua thông qua IPC
      const response = await window.electron.ipcRenderer.invoke(
        'place-buy-order',
        account.privateKey,
        tokenAddress,
        amount,
        slippage,
        networkType,
        account.unit || 'value',
        2
      );

      if (response.success) {
        // Kiểm tra lại xem window.electron và ipcRenderer có tồn tại không
        if (!window.electron || !window.electron.ipcRenderer) {
          throw new Error('IPC renderer không khả dụng');
        }

        // // Cập nhật số dư sau khi đặt lệnh thành công
        // const balance = await window.electron.ipcRenderer.invoke(
        //   'get-balance',
        //   account.privateKey,
        //   tokenAddress,
        //   networkType
        // );

        // // Cập nhật số dư trong database
        await db.accounts.update(account.id, {
          // bnbBalance: balance.bnbBalance,
          // tokenBalance: balance.tokenBalance,
          status: 'pending',
          updatedAt: new Date()
        });

        // await window.api.addLog(
        //   `Đã cập nhật số dư: ${balance.bnbBalance} BNB, ${balance.tokenBalance} Token`
        // );
        return true;
      } else {
        // Kiểm tra nếu là lỗi INVALID_AMOUNT thì đặt cycle và currentCycle về 1
        if (response.errorCode === 'INVALID_AMOUNT') {
          await db.accounts.update(account.id, {
            status: 'failed',
            cycle: 1,
            currentCycle: 1,
            updatedAt: new Date()
          });

          // Cập nhật lại đối tượng account trong bộ nhớ
          account.cycle = 1;
          account.currentCycle = 1;

          await window.api.addLog(`Lỗi số tiền không hợp lệ. Đã đặt chu kỳ về 1 để tránh lặp lại.`);
        } else {
          await db.accounts.update(account.id, {
            status: 'failed',
            updatedAt: new Date()
          });
        }

        // Log the error message from the response
        const errorMessage = response.errorMessage || response.errorCode || 'Lỗi không xác định';
        await window.api.addLog(`Lỗi khi đặt lệnh mua: ${errorMessage}`);

        return false;
      }
    } catch (error: any) {
      console.error('Lỗi khi đặt lệnh mua:', error);

      // Xử lý lỗi 'object have been destroyed'
      const errorMessage = error?.message || 'Lỗi không xác định';
      let logMessage = `Lỗi khi đặt lệnh: ${errorMessage}`;

      if (
        errorMessage.includes('destroyed') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('không khả dụng')
      ) {
        logMessage = `Lỗi kết nối: ${errorMessage}. Vui lòng khởi động lại ứng dụng.`;
      }

      // Kiểm tra nếu là lỗi số tiền không hợp lệ
      if (errorMessage.includes('số tiền') || errorMessage.includes('amount')) {
        await db.accounts.update(account.id, {
          status: 'failed',
          cycle: 1,
          currentCycle: 1,
          updatedAt: new Date()
        });

        // Cập nhật lại đối tượng account trong bộ nhớ
        account.cycle = 1;
        account.currentCycle = 1;

        await window.api.addLog(`${logMessage}. Đã đặt chu kỳ về 1 để tránh lặp lại.`);
      } else {
        await db.accounts.update(account.id, {
          status: 'failed',
          updatedAt: new Date()
        });

        await window.api.addLog(logMessage);
      }

      return false;
    }
  };

  // Đặt lệnh bán
  const placeSellOrder = async (account: any, amount: string) => {
    try {
      // Kiểm tra xem window.electron và ipcRenderer có tồn tại không
      if (!window.electron || !window.electron.ipcRenderer) {
        throw new Error('IPC renderer không khả dụng');
      }
      // Gọi hàm đặt lệnh bán thông qua IPC
      const response = await window.electron.ipcRenderer.invoke(
        'place-sell-order',
        account.privateKey,
        tokenAddress,
        amount,
        slippage,
        networkType,
        account.unit || 'value',
        2
      );

      if (response.success) {
        // Kiểm tra lại xem window.electron và ipcRenderer có tồn tại không
        if (!window.electron || !window.electron.ipcRenderer) {
          throw new Error('IPC renderer không khả dụng');
        }

        // // Cập nhật số dư sau khi đặt lệnh thành công
        // const balance = await window.electron.ipcRenderer.invoke(
        //   'get-balance',
        //   account.privateKey,
        //   tokenAddress,
        //   networkType
        // );

        // // Cập nhật số dư trong database
        await db.accounts.update(account.id, {
          status: 'pending',
          updatedAt: new Date()
        });

        // await window.api.addLog(
        //   `Đã cập nhật số dư: ${balance.bnbBalance} BNB, ${balance.tokenBalance} Token`
        // );
        return true;
      } else {
        // Kiểm tra nếu là lỗi INVALID_AMOUNT thì đặt cycle và currentCycle về 1
        if (response.errorCode === 'INVALID_AMOUNT') {
          await db.accounts.update(account.id, {
            status: 'failed',
            cycle: 1,
            currentCycle: 1,
            updatedAt: new Date()
          });

          // Cập nhật lại đối tượng account trong bộ nhớ
          account.cycle = 1;
          account.currentCycle = 1;

          await window.api.addLog(`Lỗi số tiền không hợp lệ. Đã đặt chu kỳ về 1 để tránh lặp lại.`);
        } else {
          await db.accounts.update(account.id, {
            status: 'failed',
            updatedAt: new Date()
          });
        }

        // Log the error message from the response
        const errorMessage = response.errorMessage || response.errorCode || 'Lỗi không xác định';
        await window.api.addLog(`Lỗi khi đặt lệnh bán: ${errorMessage}`);

        return false;
      }
    } catch (error: any) {
      console.error('Lỗi khi đặt lệnh bán:', error);

      // Xử lý lỗi 'object have been destroyed'
      const errorMessage = error?.message || 'Lỗi không xác định';
      let logMessage = `[${new Date().toLocaleTimeString()}] Lỗi khi đặt lệnh: ${errorMessage}`;

      if (
        errorMessage.includes('destroyed') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('không khả dụng')
      ) {
        logMessage = `[${new Date().toLocaleTimeString()}] Lỗi kết nối: ${errorMessage}. Vui lòng khởi động lại ứng dụng.`;
      }

      // Kiểm tra nếu là lỗi số tiền không hợp lệ
      if (errorMessage.includes('số tiền') || errorMessage.includes('amount')) {
        await db.accounts.update(account.id, {
          status: 'failed',
          cycle: 1,
          currentCycle: 1,
          updatedAt: new Date()
        });

        // Cập nhật lại đối tượng account trong bộ nhớ
        account.cycle = 1;
        account.currentCycle = 1;

        const updatedMessage = `${logMessage}. Đã đặt chu kỳ về 1 để tránh lặp lại.`;
        await db.logs.add({
          createdAt: new Date(),
          updatedAt: new Date(),
          message: updatedMessage
        });
      } else {
        await db.accounts.update(account.id, {
          status: 'failed',
          updatedAt: new Date()
        });

        await db.logs.add({
          createdAt: new Date(),
          updatedAt: new Date(),
          message: logMessage
        });
      }

      return false;
    }
  };

  // Thêm hàm này để bắt đầu bot từ một vị trí cụ thể
  const onStartFromAccount = async (accountId: number) => {
    // Kiểm tra các trường bắt buộc
    if (accounts.length === 0) {
      message.error('Vui lòng thêm ít nhất một ví');
      return;
    }

    if (!tokenAddress.trim()) {
      message.error('Vui lòng nhập địa chỉ token');
      return;
    }

    if (minDelay === null || maxDelay === null) {
      message.error('Vui lòng nhập thời gian chờ');
      return;
    }

    // Kiểm tra xem tài khoản có tồn tại không
    const account = await db.accounts.get(accountId);
    if (!account) {
      console.error('Không tìm thấy tài khoản với ID:', accountId);
      message.error(`Không tìm thấy tài khoản với ID: ${accountId}`);
      return;
    }

    // Reset currentCycle về 0 cho tất cả tài khoản active
    const activeAccounts = accounts.filter((account) => account.isActive === 1);
    for (const account of activeAccounts) {
      await db.accounts.update(account.id, { currentCycle: 0 });
    }

    // Lưu cài đặt trước khi bắt đầu
    saveSettings();

    // Cập nhật cả state và ref
    setIsRunning(true);
    isRunningRef.current = true;
    runModeRef.current = runMode;

    // Start power save blocker to prevent app suspension
    try {
      const result = await window.api.startPowerSaveBlocker();
      console.log('Power save blocker started:', result);

      await db.logs.add({
        createdAt: new Date(),
        updatedAt: new Date(),
        message: `Đã kích hoạt chế độ ngăn chặn tạm dừng ứng dụng`
      });
    } catch (error) {
      console.error('Failed to start power save blocker:', error);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await db.logs.add({
      createdAt: new Date(),
      updatedAt: new Date(),
      message: `[${new Date().toLocaleTimeString()}] Bắt đầu chạy từ ví ID: ${accountId} ở chế độ ${runMode === 'concurrent' ? 'đồng thời' : 'tuần tự'}`
    });

    if (runMode === 'concurrent') {
      // Trong chế độ đồng thời, chúng ta sẽ chạy tất cả các tài khoản từ vị trí này
      await runConcurrently();
    } else {
      await checkAndPlaceOrderFromAccount(accountId);
    }

    // Cập nhật cả state và ref khi kết thúc
    setIsRunning(false);
    isRunningRef.current = false;

    // Stop power save blocker
    try {
      const result = await window.api.stopPowerSaveBlocker();
      console.log('Power save blocker stopped:', result);

      await db.logs.add({
        createdAt: new Date(),
        updatedAt: new Date(),
        message: `Đã tắt chế độ ngăn chặn tạm dừng ứng dụng`
      });
    } catch (error) {
      console.error('Failed to stop power save blocker:', error);
    }

    await db.logs.add({
      createdAt: new Date(),
      updatedAt: new Date(),
      message: `[${new Date().toLocaleTimeString()}] Bot đã dừng`
    });
  };

  // Kiểm tra và đặt lệnh từ vị trí cụ thể
  const checkAndPlaceOrderFromAccount = async (startAccountId: number) => {
    // Lấy danh sách tài khoản active ban đầu
    let activeAccounts = await db.accounts.where('isActive').equals(1).toArray();
    let sortedAccounts = [...activeAccounts].sort((a, b) => a.sortOrder - b.sortOrder);

    // Tìm vị trí index của tài khoản bắt đầu
    let startIndex = sortedAccounts.findIndex((acc) => acc.id === startAccountId);
    if (startIndex === -1) startIndex = 0;

    let index = startIndex;

    while (isRunningRef.current) {
      // Cập nhật lại danh sách tài khoản mới nhất
      activeAccounts = await db.accounts.where('isActive').equals(1).toArray();
      sortedAccounts = [...activeAccounts].sort((a, b) => a.sortOrder - b.sortOrder);

      // Kiểm tra lại index sau khi cập nhật danh sách
      if (index >= sortedAccounts.length) {
        index = 0;
      }

      // Tìm tài khoản phù hợp để xử lý (active và chưa đạt số vòng chạy tối đa)
      let allAccountsFinished = true;
      let foundValidAccount = false;

      for (let i = 0; i < sortedAccounts.length; i++) {
        const checkIndex = (index + i) % sortedAccounts.length;
        const account = sortedAccounts[checkIndex];

        if (account.isActive !== 1) continue;

        if (account.cycle === 0 || account.currentCycle < account.cycle) {
          allAccountsFinished = false;
          index = checkIndex;
          foundValidAccount = true;
          break;
        }
      }

      // Nếu tất cả tài khoản đã đạt số vòng chạy tối đa
      if (allAccountsFinished) {
        await db.logs.add({
          createdAt: new Date(),
          updatedAt: new Date(),
          message: `[${new Date().toLocaleTimeString()}] Tất cả tài khoản đã đạt số vòng chạy tối đa. Dừng bot.`
        });
        isRunningRef.current = false;
        break;
      }

      // Nếu không tìm thấy tài khoản hợp lệ nào
      if (!foundValidAccount) {
        index = 0;
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      // Cập nhật currentAccountId để tô màu đúng tài khoản đang xử lý
      const currentAccount = sortedAccounts[index];
      // Kiểm tra xem currentAccount có tồn tại không trước khi truy cập thuộc tính id
      if (!currentAccount) {
        console.error('Không tìm thấy tài khoản tại index:', index);
        await window.api.addLog(`Lỗi: Không tìm thấy tài khoản tại vị trí ${index}`);

        // Đặt lại index về 0 và tiếp tục vòng lặp
        index = 0;
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      setCurrentAccountId(currentAccount.id);

      // Kiểm tra xem tài khoản có đáp ứng điều kiện cycle không
      if (currentAccount.cycle > 0 && currentAccount.currentCycle >= currentAccount.cycle) {
        await db.logs.add({
          createdAt: new Date(),
          updatedAt: new Date(),
          message: `[${new Date().toLocaleTimeString()}] Bỏ qua tài khoản ${currentAccount.name} (ID: ${currentAccount.id}) vì đã đạt số vòng chạy tối đa: ${currentAccount.currentCycle}/${currentAccount.cycle}`
        });
        index++;
        continue;
      }

      // Ghi log tài khoản hiện tại
      await db.logs.add({
        createdAt: new Date(),
        updatedAt: new Date(),
        message: `[${new Date().toLocaleTimeString()}] Đang xử lý tài khoản: ${currentAccount.name} (ID: ${currentAccount.id}) - Vòng chạy: ${currentAccount.currentCycle + 1}/${currentAccount.cycle === 0 ? '∞' : currentAccount.cycle}`
      });

      // Cập nhật trạng thái ví
      await db.accounts.update(currentAccount.id, { status: 'placing' });

      if (currentAccount.type == 'buy') {
        await placeBuyOrder(currentAccount, currentAccount.amountIn.toString());
      } else {
        await placeSellOrder(currentAccount, currentAccount.amountIn.toString());
      }

      // Lấy thông tin tài khoản mới nhất từ database để đảm bảo có thông tin cycle và currentCycle mới nhất
      // (trong trường hợp đã được cập nhật bởi placeBuyOrder/placeSellOrder khi gặp lỗi INVALID_AMOUNT)
      const updatedAccount = await db.accounts.get(currentAccount.id);

      // Cập nhật lại đối tượng currentAccount trong bộ nhớ với dữ liệu mới nhất
      if (updatedAccount) {
        currentAccount.cycle = updatedAccount.cycle;
        currentAccount.currentCycle = updatedAccount.currentCycle;
      }

      // Nếu không phải lỗi INVALID_AMOUNT (đã được xử lý trong placeBuyOrder/placeSellOrder)
      // thì tăng số vòng chạy hiện tại
      if (currentAccount.cycle !== 1 || currentAccount.currentCycle !== 1) {
        const newCycle = currentAccount.currentCycle + 1;
        await db.accounts.update(currentAccount.id, {
          currentCycle: newCycle
        });
        // Cập nhật giá trị trong bộ nhớ
        currentAccount.currentCycle = newCycle;
      }

      // Chuyển sang tài khoản tiếp theo
      index++;

      const waitTime = _.random(minDelay, maxDelay);
      updateCountdown(waitTime);

      await db.logs.add({
        createdAt: new Date(),
        updatedAt: new Date(),
        message: `[${new Date().toLocaleTimeString()}] Đợi ${waitTime} giây để tiếp tục`
      });

      // Bắt đầu đếm ngược
      for (let i = waitTime; i >= 0; i--) {
        if (!isRunningRef.current) break;
        updateCountdown(i);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  };

  // =============== UI HELPER FUNCTIONS ===============
  // Lấy màu hiển thị cho trạng thái
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'placing':
        return 'processing';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  // Lấy text hiển thị cho trạng thái
  const getStatusText = (status: string) => {
    switch (status) {
      case 'placing':
        return 'Đang đặt lệnh';
      case 'pending':
        return 'Chờ';
      case 'failed':
        return 'Lỗi';
      default:
        return 'Không xác định';
    }
  };

  // =============== DATA CALCULATIONS ===============
  // Tính tổng số dư BNB và token
  const uniqAccounts = _.uniqBy(
    [...accounts].sort((a, b) => dayjs(b.updatedAt).diff(dayjs(a.updatedAt))),
    'address'
  );

  const totalBnbBalance = uniqAccounts.reduce(
    (sum, account) => sum + Number(account.bnbBalance),
    0
  );

  const totalTokenBalance = uniqAccounts.reduce(
    (sum, account) => sum + Number(account.tokenBalance),
    0
  );

  const totalActiveAccounts = accounts.filter((account) => account.isActive === 1).length;

  const totalPendingAccounts = accounts.filter((account) => account.status === 'pending').length;

  // Tạo bottom row cho bảng
  const summaryRow = {
    id: 'summary',
    address: 'Tổng',
    bnbBalance: totalBnbBalance,
    tokenBalance: totalTokenBalance,
    activeCount: totalActiveAccounts,
    pendingCount: totalPendingAccounts
  };

  const toLocaleString = (value: number | string, fixed = 0) => {
    if (value === undefined || value === null) return '';
    // Xử lý số thập phân đúng cách
    const parts = value.toString().split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length > 1 && fixed > 0
      ? `${integerPart}.${parts[1].slice(0, fixed)}`
      : integerPart;
  };
  // =============== TABLE CONFIGURATION ===============
  const components = {
    body: {
      row: SortableEditableRow,
      cell: EditableCell
    }
  };

  // Hàm xử lý khi thay đổi loại số tiền
  const handleAmountTypeChange = (type: '25' | '50' | '75' | '100' | 'custom', record: any) => {
    let newAmount = record.amountIn;
    let newUnit = record.unit;
    let cycles = 0;

    if (type !== 'custom') {
      newAmount = parseInt(type);
      newUnit = 'percent';

      // Thiết lập số chu kỳ dựa trên giá trị phần trăm
      cycles = type === '75' || type === '100' ? 1 : type === '50' ? 2 : 3;

      db.accounts
        .update(record.id, {
          amountIn: newAmount,
          unit: newUnit,
          cycle: cycles, // Cập nhật số chu kỳ dựa vào phần trăm
          updatedAt: new Date()
        })
        .then(() => {
          message.success('Đã cập nhật số tiền');
        });
    } else {
      // Khi chọn "Tùy chỉnh", bật chế độ chỉnh sửa và đặt giá trị mặc định là 3500012
      setEditingAmountId(record.id);

      // Nếu đang ở chế độ phần trăm, khi chuyển sang custom dùng giá trị mặc định 3500012
      if (record.unit === 'percent') {
        setCustomAmount('3500012');
      } else {
        // Nếu đã ở chế độ custom, giữ nguyên giá trị hiện tại
        setCustomAmount(record.amountIn.toString());
      }

      // Focus vào input sau khi render
      setTimeout(() => {
        if (customAmountRef.current) {
          customAmountRef.current.focus();
        }
      }, 100);
    }
  };

  const formatNumberString = (value: string, fixed = 0) => {
    if (value === undefined || value === null) return '';
    // Xử lý số thập phân đúng cách
    const parts = String(value).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length > 1 && fixed > 0
      ? `${integerPart}.${parts[1].slice(0, fixed)}`
      : integerPart;
  };
  // Hàm lưu giá trị tùy chỉnh
  const saveCustomAmount = (record: any) => {
    const numValue = parseFloat(customAmount || '0');
    if (isNaN(numValue)) {
      message.error('Vui lòng nhập số hợp lệ');
      return;
    }

    db.accounts
      .update(record.id, {
        amountIn: numValue,
        unit: 'value',
        cycle: 0, // Đặt chu kỳ về 0 khi thay đổi tiền vào tùy chỉnh
        updatedAt: new Date()
      })
      .then(() => {
        message.success('Đã cập nhật số tiền');
        setEditingAmountId(null);
      });
  };

  // Định nghĩa các cột với hỗ trợ chỉnh sửa
  const defaultColumns = [
    {
      title: '',
      key: 'sort',
      width: 30,
      className: 'drag-handle-column',
      align: 'center' as const,
      render: (_: any, record: any) => {
        // Không hiển thị nút kéo thả cho dòng summary
        if (record.id === 'summary') return null;
        return <DragHandle rowId={record.id} />;
      }
    },
    {
      title: 'STT',
      key: 'index',
      width: 30,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => {
        return index + 1;
      }
    },
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
      width: 50,
      align: 'center' as const,
      editable: true,
      inputType: 'text' as const,
      render: (name: string) => name || '-'
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'address',
      key: 'address',
      width: 70,
      align: 'center' as const,
      render: (address: string) =>
        address !== 'Tổng' ? (
          <Text style={{ fontFamily: 'monospace' }}>
            {address.slice(0, 3)}...{address.slice(-4)}
          </Text>
        ) : (
          address
        )
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: 40,
      align: 'center' as const,
      render: (type: string, record: any) => (
        <Switch
          checked={type === 'buy'}
          onChange={(checked) => {
            const newType = checked ? 'buy' : 'sell';
            // Cập nhật trực tiếp vào cơ sở dữ liệu
            db.accounts
              .update(record.id, {
                type: newType,
                updatedAt: new Date()
              })

              .catch((error) => {
                console.error('Lỗi khi cập nhật loại:', error);
                message.error('Không thể cập nhật loại');
              });
          }}
          checkedChildren="Mua"
          unCheckedChildren="Bán"
          className="type-switch"
          style={{
            fontSize: '12px',
            fontWeight: 'bold',
            minWidth: '60px'
          }}
        />
      )
    },
    {
      title: 'Tiền vào',
      dataIndex: 'amountIn',
      key: 'amountIn',
      width: 60,
      align: 'center' as const,
      editable: false,
      inputType: 'number' as const,
      render: (value: any, record: any) => {
        if (record.id === 'summary') return value;

        const isEditing = editingAmountId === record.id;
        const isCustom =
          record.unit !== 'percent' ||
          (record.amountIn !== 25 &&
            record.amountIn !== 50 &&
            record.amountIn !== 75 &&
            record.amountIn !== 100);
        // Kiểm tra xem giá trị có phải là một trong các giá trị phần trăm tiêu chuẩn không
        // Không cần lưu giá trị này vì chúng ta đã có isCustom

        // Xác định giá trị hiển thị cho ô tùy chỉnh
        const customDisplayValue = isCustom ? (value ? toLocaleString(value, 6) : '') : '';

        return isEditing ? (
          <InputNumber
            ref={customAmountRef}
            style={{ width: '100%' }}
            value={customAmount}
            onChange={(value) => setCustomAmount(value ? value.toString() : '')}
            onPressEnter={() => saveCustomAmount(record)}
            onBlur={() => saveCustomAmount(record)}
            formatter={(value) => {
              if (value === undefined || value === null) return '';
              const parts = value.toString().split('.');
              const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
              return parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
            }}
            parser={(value) => {
              if (!value) return '';
              return value.replace(/\$\s?|(,*)/g, '');
            }}
          />
        ) : (
          <Radio.Button
            value="custom"
            checked={isCustom}
            onClick={() => handleAmountTypeChange('custom', record)}
            style={{ width: '100%' }}
          >
            {customDisplayValue}
          </Radio.Button>
        );
      }
    },

    {
      title: 'Số dư',
      align: 'center' as const,
      children: [
        {
          title: 'BNB',
          dataIndex: 'bnbBalance',
          key: 'bnbBalance',
          width: 60,
          align: 'center' as const,
          render: (balance: string) => (balance ? formatNumberString(balance, 3) : '0')
        },
        {
          title: 'Token',
          dataIndex: 'tokenBalance',
          key: 'tokenBalance',
          width: 60,
          align: 'center' as const,
          render: (balance: string) => (balance ? formatNumberString(balance, 3) : '0')
        }
      ]
    },
    {
      title: 'Hiện trạng',
      dataIndex: 'status',
      key: 'status',
      width: 50,
      align: 'center' as const,
      render: (status: string) =>
        status ? <Badge status={getStatusColor(status)} text={getStatusText(status)} /> : ''
    },

    {
      title: () => (
        <Button
          type="primary"
          size="small"
          onClick={toggleAllAccounts}
          icon={allAccountsActive ? <PoweroffOutlined /> : <CheckOutlined />}
          loading={isLoading}
        >
          {allAccountsActive ? 'Tắt' : 'Bật'}
        </Button>
      ),
      dataIndex: 'isActive',
      key: 'isActive',
      width: 50,
      align: 'center' as const,
      render: (isActive: number, record: any) => (
        <Switch
          checked={isActive === 1}
          onChange={(checked) => handleToggleActive(record.id, checked)}
          checkedChildren="Bật"
          unCheckedChildren="Tắt"
        />
      )
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 100,
      align: 'center' as const,
      render: (_text: string, record: any) => {
        if (record.id === 'summary') return null;

        return (
          <Space size="small">
            {/* Nút bắt đầu từ ví này khi không chạy */}
            {!isRunning && (
              <Button
                type="primary"
                size="small"
                icon={<CaretRightOutlined />}
                onClick={() => onStartFromAccount(record.id)}
                title="Bắt đầu từ ví này"
              />
            )}
            {/* Nút xóa */}
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteAccount(record.id)}
              title="Xóa"
            />
          </Space>
        );
      }
    },
    {
      title: 'Vòng chạy',
      dataIndex: 'cycle',
      key: 'cycle',
      width: 50,
      align: 'center' as const,
      render: (_cycle: number, record: any) => {
        if (record.id === 'summary') return null;

        const currentCycle = record.currentCycle || 0;
        const maxCycle = record.cycle === 0 ? '∞' : record.cycle;

        return `${currentCycle}/${maxCycle}`;
      }
    }
  ];

  // Thiết lập các cột cuối cùng với các thuộc tính cho editable cell
  const columns = defaultColumns.map((col) => {
    if (!('editable' in col)) {
      return col;
    }
    return {
      ...col,
      onCell: (record: any) => ({
        record,
        editable: col.editable && record.id !== 'summary',
        dataIndex: col.dataIndex,
        title: typeof col.title === 'function' ? `${col.dataIndex}` : col.title, // Chuyển title là function thành string
        inputType: col.inputType,
        options: 'options' in col ? col.options : undefined,
        handleSave
      })
    };
  });

  const summaryColumns = [
    {
      title: '',
      key: 'sort',
      width: 30,
      align: 'center' as const
    },
    {
      title: 'STT',
      dataIndex: 'index',
      key: 'index',
      width: 30
    },
    {
      title: 'Tên',
      dataIndex: 'type',
      key: 'name',
      width: 50
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'address',
      key: 'address',
      width: 70
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: 40
    },
    {
      title: 'Tiền vào',
      dataIndex: 'amountIn',
      key: 'amountIn',
      width: 60
    },

    {
      title: 'Số dư',

      children: [
        {
          title: 'BNB',
          dataIndex: 'bnbBalance',
          key: 'bnbBalance',
          width: 60,
          align: 'center' as const,
          render: (balance: string) => (balance ? toLocaleString(balance, 3) : '0')
        },
        {
          title: 'Token',
          dataIndex: 'tokenBalance',
          key: 'tokenBalance',
          width: 60,
          align: 'center' as const,
          render: (balance: string) => (balance ? toLocaleString(balance, 0) : '0')
        }
      ]
    },
    {
      title: 'Hiện trạng',
      dataIndex: 'pendingCount',
      key: 'pendingCount',
      width: 50,
      align: 'center' as const
    },

    {
      title: 'Hoạt động',
      dataIndex: 'activeCount',
      key: 'activeCount',
      width: 50,
      align: 'center' as const
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      align: 'center' as const
    },
    {
      title: 'Vòng chạy',
      dataIndex: 'cycle',
      key: 'cycle',
      width: 50,
      align: 'center' as const
    }
  ];
  // Xóa toàn bộ log
  const handleClearLogs = async () => {
    try {
      await db.logs.clear();
      message.success('Đã xóa toàn bộ log');
      await window.api.addLog('Log đã được xóa');
    } catch (error) {
      console.error('Lỗi khi xóa log:', error);
      message.error('Không thể xóa log');
    }
  };

  // Cập nhật state khi refs thay đổi
  useEffect(() => {
    const updatePrices = () => {
      setLastBuyPrice(lastBuyPriceRef.current);
      setLastSellPrice(lastSellPriceRef.current);
    };

    // Cập nhật ban đầu
    updatePrices();

    // Thiết lập interval để cập nhật định kỳ
    const intervalId = setInterval(updatePrices, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Effect để theo dõi currentAccountId
  useEffect(() => {
    console.log('currentAccountId đã thay đổi thành:', currentAccountId);
  }, [currentAccountId]);

  // Thêm useEffect để quản lý vòng đời của component và dọn dẹp các resources
  useEffect(() => {
    // Đăng ký các listeners cho IPC events
    const logRemover = window.api.onLog((message) => {
      db.logs.add({
        createdAt: new Date(),
        updatedAt: new Date(),
        message: `[${new Date().toLocaleTimeString()}] ${message}`
      });
    });

    const statusRemover = window.api.onUpdateAccountStatus((data) => {
      db.accounts.update(data.id, {
        status: data.status as 'placing' | 'pending' | 'failed',
        updatedAt: new Date()
      });
    });

    // Hàm dọn dẹp khi component unmount
    return () => {
      // Dừng bot nếu đang chạy
      if (isRunningRef.current) {
        isRunningRef.current = false;
        setIsRunning(false);

        // Thử gọi stopBot API nếu electron tồn tại
        try {
          if (window.electron && window.electron.ipcRenderer) {
            window.electron.ipcRenderer
              .invoke('stop-bot')
              .catch((err) => console.error('Lỗi khi dừng bot trong cleanup:', err));
          }
        } catch (error) {
          console.error('Lỗi khi gọi API stopBot trong cleanup:', error);
        }
      }

      // Gọi hàm cleanup của các IPC listeners
      logRemover();
      statusRemover();

      // Reset refs
      lastBuyPriceRef.current = 0;
      lastSellPriceRef.current = Infinity;
      countdownRef.current = 0;

      console.log('BotControl component đã được dọn dẹp');
    };
  }, []); // Empty dependency array means it runs once on mount and cleanup on unmount

  // Cập nhật tất cả tài khoản về trạng thái "Chờ"
  const handleResetAllAccounts = async () => {
    try {
      // Lấy tất cả tài khoản
      const allAccounts = await db.accounts.toArray();

      await db.accounts.bulkUpdate(
        allAccounts.map((account) => ({
          key: account.id,
          changes: {
            status: 'pending',
            updatedAt: new Date(),
            currentCycle: 0
          }
        }))
      );

      message.success('Đã cập nhật tất cả tài khoản về trạng thái Chờ');
    } catch (error) {
      console.error('Lỗi khi cập nhật tài khoản:', error);
      message.error('Không thể cập nhật tài khoản');
    }
  };

  // Effect để cuộn đến hàng đang chạy khi currentAccountId thay đổi
  useEffect(() => {
    if (currentAccountId > 0 && isRunning) {
      console.log('Đang chuẩn bị cuộn đến tài khoản ID:', currentAccountId);

      // Sử dụng setTimeout lâu hơn để đảm bảo DOM đã được cập nhật hoàn toàn
      setTimeout(() => {
        try {
          // Tìm phần tử DOM của hàng đang chạy bằng cách kết hợp nhiều selector để chính xác hơn
          const rowSelector = `tr[data-row-key="${currentAccountId}"]`;
          console.log('Tìm phần tử với selector:', rowSelector);

          const allRows = document.querySelectorAll('tr[data-row-key]');
          console.log('Tổng số hàng trong bảng:', allRows.length);

          const rowElement = document.querySelector(rowSelector) as HTMLElement;

          console.log('Tìm thấy phần tử hàng:', rowElement ? 'Có' : 'Không');

          if (rowElement) {
            console.log('Đã tìm thấy hàng, đang chuẩn bị cuộn');

            // Tìm container của bảng
            const tableContainers = document.querySelectorAll('.ant-table-body');
            console.log('Số lượng container bảng:', tableContainers.length);

            // Sử dụng container cuối cùng (trong trường hợp có nhiều bảng)
            const tableContainer = tableContainers[tableContainers.length - 1] as HTMLElement;

            if (tableContainer) {
              console.log('Tìm thấy container bảng');

              // Cuộn đến vị trí của hàng
              const rowTop = rowElement.offsetTop;
              const containerHeight = tableContainer.clientHeight;
              const scrollTo = rowTop - containerHeight / 2 + rowElement.clientHeight / 2;

              console.log('Thông số cuộn:', {
                rowTop,
                containerHeight,
                scrollTo,
                currentScrollTop: tableContainer.scrollTop,
                rowHeight: rowElement.clientHeight
              });

              // Thử cả hai cách cuộn
              tableContainer.scrollTo({
                top: scrollTo,
                behavior: 'smooth'
              });

              // Backup: sử dụng phương thức scrollTop trực tiếp
              setTimeout(() => {
                tableContainer.scrollTop = scrollTo;
                console.log('Đã cuộn đến vị trí:', scrollTo);
              }, 50);
            } else {
              console.log('Không tìm thấy container bảng');
            }
          } else {
            console.log('Không tìm thấy hàng cần cuộn đến');
          }
        } catch (error) {
          console.error('Lỗi khi cuộn đến hàng đang chạy:', error);
        }
      }, 300); // Tăng thời gian chờ lên 300ms
    }
  }, [currentAccountId, isRunning]);

  // Xóa toàn bộ tài khoản
  const handleDeleteAllAccounts = async () => {
    try {
      Modal.confirm({
        title: 'Xác nhận xóa',
        content: 'Bạn có chắc chắn muốn xóa tất cả tài khoản không?',
        okText: 'Xóa tất cả',
        okType: 'danger',
        cancelText: 'Hủy',
        onOk: async () => {
          await db.accounts.clear();
          message.success('Đã xóa tất cả tài khoản');
        }
      });
    } catch (error) {
      console.error('Lỗi khi xóa tài khoản:', error);
      message.error('Không thể xóa tài khoản');
    }
  };

  // =============== EXPORT/IMPORT FUNCTIONS ===============
  // Xuất danh sách tài khoản
  const exportAccounts = () => {
    try {
      const accountsData = accounts.map((account) => {
        // Bỏ qua các trường nhạy cảm như privateKey nếu cần
        const { createdAt, updatedAt, ...exportData } = account;
        return {
          ...exportData,
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString()
        };
      });

      const jsonString = JSON.stringify(accountsData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `accounts-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      message.success('Xuất danh sách tài khoản thành công');
    } catch (error) {
      console.error('Lỗi khi xuất danh sách tài khoản:', error);
      message.error('Không thể xuất danh sách tài khoản');
    }
  };

  // Nhập danh sách tài khoản
  const importAccounts = (file: File) => {
    try {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const importedAccounts = JSON.parse(content);

          if (!Array.isArray(importedAccounts)) {
            message.error('File không đúng định dạng');
            return;
          }

          // Kiểm tra số lượng tài khoản hiện tại để xác định sortOrder
          const accountCount = await db.accounts.count();

          // Xác nhận trước khi nhập
          Modal.confirm({
            title: 'Xác nhận nhập',
            content: `Bạn có chắc chắn muốn nhập ${importedAccounts.length} tài khoản?`,
            okText: 'Nhập',
            cancelText: 'Hủy',
            onOk: async () => {
              try {
                for (let i = 0; i < importedAccounts.length; i++) {
                  const account = importedAccounts[i];

                  // Chuyển đổi chuỗi ngày thành đối tượng Date
                  const createdAt = new Date(account.createdAt || new Date());
                  const updatedAt = new Date(account.updatedAt || new Date());

                  // Tạo ID mới để tránh xung đột
                  const newAccount = {
                    ...account,
                    id: Date.now() + i, // Đảm bảo các ID khác nhau
                    createdAt,
                    updatedAt,
                    sortOrder: accountCount + i, // Sắp xếp theo thứ tự
                    isActive: 1,
                    status: account.status || 'pending'
                  };

                  await db.accounts.add(newAccount);
                }

                message.success(`Đã nhập ${importedAccounts.length} tài khoản thành công`);
              } catch (error) {
                console.error('Lỗi khi nhập tài khoản:', error);
                message.error('Không thể nhập tài khoản');
              }
            }
          });
        } catch (error) {
          console.error('Lỗi khi phân tích file:', error);
          message.error('Không thể đọc file');
        }
      };

      reader.readAsText(file);
      return false; // Ngăn tải file lên tự động
    } catch (error) {
      console.error('Lỗi khi nhập tài khoản:', error);
      message.error('Không thể nhập tài khoản');
      return false;
    }
  };

  // =============== TABLE EDIT FUNCTIONS ===============
  const handleSave = async (row: any) => {
    try {
      const newData = [...sortedAccounts];
      const index = newData.findIndex((item) => row.id === item.id);
      if (index > -1) {
        const item = newData[index];
        const updatedItem = {
          ...item,
          ...row,
          updatedAt: new Date()
        };
        newData.splice(index, 1, updatedItem);
        setSortedAccounts(newData);

        // Xử lý amountType nếu không phải là custom
        let finalAmount = parseFloat(row.amountIn);
        let finalUnit = row.unit || 'value';

        if (row.amountType && row.amountType !== 'custom') {
          finalAmount = parseInt(row.amountType);
          finalUnit = 'percent';
        }

        // Cập nhật vào cơ sở dữ liệu
        await db.accounts.update(row.id, {
          name: row.name,
          type: row.type,
          amountIn: finalAmount,
          unit: finalUnit,
          tokenAddress: tokenAddress,
          cycle: row.cycle || 0,
          updatedAt: new Date()
        });

        message.success('Đã cập nhật ví');
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật ví:', error);
      message.error('Không thể cập nhật ví');
    }
  };

  // Thêm các hàm xử lý để cập nhật tất cả tài khoản
  const updateAllAccountsToSell = async (percentValue: 25 | 50 | 75 | 100, cycles: number) => {
    console.log(cycles);
    try {
      setIsLoading(true);
      // Lấy tất cả tài khoản và sắp xếp theo số dư token (lớn nhất lên đầu)
      const allAccounts = await db.accounts.toArray();
      const sortedAccounts = [...allAccounts].sort((a, b) => {
        const tokenBalanceA =
          typeof a.tokenBalance === 'string' ? parseFloat(a.tokenBalance) : a.tokenBalance || 0;
        const tokenBalanceB =
          typeof b.tokenBalance === 'string' ? parseFloat(b.tokenBalance) : b.tokenBalance || 0;
        return tokenBalanceB - tokenBalanceA;
      });

      await db.accounts.bulkUpdate(
        sortedAccounts.map((account, i) => ({
          key: account.id,
          changes: {
            type: 'sell',
            amountIn: percentValue,
            unit: 'percent',
            isActive: 1,
            sortOrder: i,
            cycle: cycles, // Cập nhật số chu kỳ
            updatedAt: new Date()
          }
        }))
      );

      message.success(`Đã cập nhật tất cả tài khoản thành Bán ${percentValue}%`);
    } catch (error) {
      console.error('Lỗi khi cập nhật tài khoản:', error);
      message.error('Không thể cập nhật tài khoản');
    } finally {
      setIsLoading(false);
    }
  };

  // Thêm state và hàm xử lý cho modal tùy chỉnh
  const [isCustomBulkModalVisible, setIsCustomBulkModalVisible] = useState<boolean>(false);
  const [bulkCustomAmount, setBulkCustomAmount] = useState<string>('3500012');

  const showCustomBulkModal = () => {
    // Đặt giá trị mặc định khi mở modal
    setBulkCustomAmount('3500012');
    // Đặt trạng thái hiển thị modal
    setIsCustomBulkModalVisible(true);
    // Đặt giá trị selectedSellPercent để nút được chọn
    setSelectedSellPercent('custom');
  };

  const handleCustomBulkCancel = () => {
    setIsCustomBulkModalVisible(false);
    // Reset lại selectedSellPercent để có thể nhấn lại
    setSelectedSellPercent('none');
  };

  const handleCustomBulkOk = async () => {
    const numValue = parseFloat(bulkCustomAmount || '0');
    if (isNaN(numValue)) {
      message.error('Vui lòng nhập số hợp lệ');
      return;
    }

    try {
      setIsLoading(true);
      // Lấy tất cả tài khoản và sắp xếp theo số dư token (lớn nhất lên đầu)
      const allAccounts = await db.accounts.toArray();
      const sortedAccounts = [...allAccounts].sort((a, b) => {
        const tokenBalanceA =
          typeof a.tokenBalance === 'string' ? parseFloat(a.tokenBalance) : a.tokenBalance || 0;
        const tokenBalanceB =
          typeof b.tokenBalance === 'string' ? parseFloat(b.tokenBalance) : b.tokenBalance || 0;
        return tokenBalanceB - tokenBalanceA;
      });

      // Cập nhật từng tài khoản
      await db.accounts.bulkUpdate(
        sortedAccounts.map((account, i) => ({
          key: account.id,
          changes: {
            type: 'sell',
            amountIn: numValue,
            unit: 'value',
            isActive: 1,
            sortOrder: i,
            cycle: 0, // Không giới hạn chu kỳ
            updatedAt: new Date()
          }
        }))
      );
      for (let i = 0; i < sortedAccounts.length; i++) {
        const account = sortedAccounts[i];
        await db.accounts.update(account.id, {
          type: 'sell',
          amountIn: numValue,
          unit: 'value',
          isActive: 1,
          sortOrder: i,
          cycle: 0, // Không giới hạn chu kỳ
          updatedAt: new Date()
        });
      }

      message.success(`Đã cập nhật tất cả tài khoản thành Bán với số tiền tùy chỉnh`);
      setIsCustomBulkModalVisible(false);
      // Reset lại selectedSellPercent để có thể nhấn lại
      setSelectedSellPercent('none');
    } catch (error) {
      console.error('Lỗi khi cập nhật tài khoản:', error);
      message.error('Không thể cập nhật tài khoản');
    } finally {
      setIsLoading(false);
    }
  };

  // Thêm hàm xử lý để cập nhật tất cả tài khoản sang lệnh MUA
  const updateAllAccountsToBuy = async (percentValue: 25 | 50 | 75 | 100, cycles: number) => {
    console.log(cycles);
    try {
      setIsLoading(true);
      // Lấy tất cả tài khoản và sắp xếp theo số dư BNB (lớn nhất lên đầu)
      const allAccounts = await db.accounts.toArray();
      const sortedAccounts = [...allAccounts].sort((a, b) => {
        const bnbBalanceA =
          typeof a.bnbBalance === 'string' ? parseFloat(a.bnbBalance) : a.bnbBalance || 0;
        const bnbBalanceB =
          typeof b.bnbBalance === 'string' ? parseFloat(b.bnbBalance) : b.bnbBalance || 0;
        return bnbBalanceB - bnbBalanceA;
      });

      // Cập nhật từng tài khoản
      await db.accounts.bulkUpdate(
        sortedAccounts.map((account, i) => ({
          key: account.id,
          changes: {
            type: 'buy',
            amountIn: percentValue,
            unit: 'percent',
            isActive: 1,
            sortOrder: i,
            cycle: cycles, // Cập nhật số chu kỳ
            updatedAt: new Date()
          }
        }))
      );

      message.success(
        `Đã cập nhật tất cả tài khoản thành Mua ${percentValue}% và sắp xếp theo số dư BNB`
      );
    } catch (error) {
      console.error('Lỗi khi cập nhật tài khoản:', error);
      message.error('Không thể cập nhật tài khoản');
    } finally {
      setIsLoading(false);
    }
  };

  // Thêm state và hàm xử lý cho modal tùy chỉnh cho lệnh mua
  const [isCustomBulkBuyModalVisible, setIsCustomBulkBuyModalVisible] = useState<boolean>(false);
  const [bulkCustomBuyAmount, setBulkCustomBuyAmount] = useState<string>('3500012');

  const showCustomBulkBuyModal = () => {
    // Đặt giá trị mặc định khi mở modal
    setBulkCustomBuyAmount('3500012');
    // Đặt trạng thái hiển thị modal
    setIsCustomBulkBuyModalVisible(true);
    // Đặt giá trị selectedBuyPercent để nút được chọn
    setSelectedBuyPercent('custom');
  };

  const handleCustomBulkBuyCancel = () => {
    setIsCustomBulkBuyModalVisible(false);
    // Reset lại selectedBuyPercent để có thể nhấn lại
    setSelectedBuyPercent('none');
  };

  const handleCustomBulkBuyOk = async () => {
    const numValue = parseFloat(bulkCustomBuyAmount || '0');
    if (isNaN(numValue)) {
      message.error('Vui lòng nhập số hợp lệ');
      return;
    }

    try {
      setIsLoading(true);
      // Lấy tất cả tài khoản và sắp xếp theo số dư BNB (lớn nhất lên đầu)
      const allAccounts = await db.accounts.toArray();
      const sortedAccounts = [...allAccounts].sort((a, b) => {
        const bnbBalanceA =
          typeof a.bnbBalance === 'string' ? parseFloat(a.bnbBalance) : a.bnbBalance || 0;
        const bnbBalanceB =
          typeof b.bnbBalance === 'string' ? parseFloat(b.bnbBalance) : b.bnbBalance || 0;
        return bnbBalanceB - bnbBalanceA;
      });

      // Cập nhật từng tài khoản
      await db.accounts.bulkUpdate(
        sortedAccounts.map((account, i) => ({
          key: account.id,
          changes: {
            type: 'buy',
            amountIn: numValue,
            unit: 'value',
            isActive: 1,
            sortOrder: i,
            cycle: 0, // Không giới hạn chu kỳ
            updatedAt: new Date()
          }
        }))
      );

      message.success(
        `Đã cập nhật tất cả tài khoản thành Mua với số tiền tùy chỉnh và sắp xếp theo số dư BNB`
      );
      setIsCustomBulkBuyModalVisible(false);
      // Reset lại selectedBuyPercent để có thể nhấn lại
      setSelectedBuyPercent('none');
    } catch (error) {
      console.error('Lỗi khi cập nhật tài khoản:', error);
      message.error('Không thể cập nhật tài khoản');
    } finally {
      setIsLoading(false);
    }
  };

  // Biến state để theo dõi trạng thái bật/tắt của tất cả tài khoản
  const [allAccountsActive, setAllAccountsActive] = useState<boolean>(false);

  // useEffect để cập nhật trạng thái allAccountsActive
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      const allActive = accounts.every((account) => account.isActive === 1);
      setAllAccountsActive(allActive);
    } else {
      setAllAccountsActive(false);
    }
  }, [accounts]);

  // Hàm chuyển đổi để bật/tắt tất cả tài khoản
  const toggleAllAccounts = async () => {
    try {
      setIsLoading(true);
      const allActive = accounts.every((account) => account.isActive === 1);

      for (const account of accounts) {
        await db.accounts.update(account.id, {
          isActive: allActive ? 0 : 1
        });
      }

      message.success(`Đã ${allActive ? 'tắt' : 'bật'} tất cả tài khoản`);
    } catch (error) {
      console.error('Lỗi khi bật/tắt tất cả tài khoản:', error);
      message.error('Không thể bật/tắt tất cả tài khoản');
    } finally {
      setIsLoading(false);
    }
  };

  // Cập nhật balance cho tất cả tài khoản
  const updateAllAccountsBalance = async () => {
    try {
      setIsLoading(true);
      message.loading({ content: 'Đang cập nhật số dư...', key: 'updateBalance', duration: 0 });

      let successCount = 0;
      let errorCount = 0;

      // Sử dụng Promise.all để cập nhật đồng thời
      const updatePromises = accounts.map(async (account) => {
        try {
          // Kiểm tra xem window.electron và ipcRenderer có tồn tại không
          if (!window.electron || !window.electron.ipcRenderer) {
            throw new Error('IPC renderer không khả dụng');
          }

          // Gọi API để lấy số dư
          const response = await window.electron.ipcRenderer.invoke(
            'get-balance',
            account.privateKey,
            tokenAddress,
            networkType
          );

          if (!response.success) {
            throw new Error(
              response.errorMessage || response.errorCode || 'Lỗi không xác định khi lấy số dư'
            );
          }

          // Cập nhật số dư trong database
          await db.accounts.update(account.id, {
            bnbBalance: response.data.bnbBalance,
            tokenBalance: response.data.tokenBalance,
            updatedAt: new Date()
          });

          successCount++;
          return { success: true };
        } catch (error) {
          console.error(`Lỗi khi cập nhật số dư cho tài khoản ${account.id}:`, error);
          errorCount++;
          return { success: false, accountId: account.id, error };
        }
      });

      // Chờ tất cả các promise hoàn thành
      await Promise.all(updatePromises);

      message.destroy('updateBalance');
      if (errorCount > 0) {
        message.info(
          `Đã cập nhật ${successCount} tài khoản thành công, ${errorCount} tài khoản thất bại`
        );
      } else {
        message.success(`Đã cập nhật số dư cho ${successCount} tài khoản thành công`);
      }
    } catch (error) {
      message.destroy('updateBalance');
      console.error('Lỗi khi cập nhật số dư tài khoản:', error);
      message.error('Không thể cập nhật số dư tài khoản');
    } finally {
      setIsLoading(false);
    }
  };

  // Thêm state cho Radio Button
  const [selectedBuyPercent, setSelectedBuyPercent] = useState<
    '25' | '50' | '75' | '100' | 'custom' | 'none'
  >('none');
  const [selectedSellPercent, setSelectedSellPercent] = useState<
    '25' | '50' | '75' | '100' | 'custom' | 'none'
  >('none');

  // =============== RENDER UI ===============
  return (
    <div
      style={{
        padding: '10px',
        width: '100%',
        margin: '0 auto',
        height: '100vh',
        overflowY: 'auto',
        ...scrollbarStyle
      }}
    >
      <Row gutter={24}>
        <Col span={16}>
          <Card>
            <Space>
              <Form.Item label="Địa chỉ Token" required>
                <Input
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  placeholder="Nhập địa chỉ token (0x...)"
                  style={{ fontFamily: 'monospace' }}
                />
              </Form.Item>

              <Form.Item label="Chờ từ" required>
                <InputNumber
                  type="number"
                  value={minDelay}
                  defaultValue={minDelay}
                  onChange={(e) => setMinDelay(e)}
                  placeholder="1"
                  min={0}
                />
              </Form.Item>

              <Form.Item label="Đến">
                <InputNumber
                  type="number"
                  value={maxDelay}
                  defaultValue={maxDelay}
                  onChange={(e) => setMaxDelay(e)}
                  placeholder="5"
                  min={0}
                />
              </Form.Item>

              <Form.Item label="Slippage (%)" required>
                <InputNumber
                  value={slippage}
                  defaultValue={slippage}
                  onChange={(value) => setSlippage(value)}
                  placeholder="1"
                  min={0.1}
                  step={0.1}
                  decimalSeparator="."
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item label="Mạng" required>
                <Select
                  value={networkType}
                  onChange={(value) => setNetworkType(value)}
                  style={{ width: '100%' }}
                >
                  <Option value="MAINNET">MAINNET</Option>
                  <Option value="TESTNET">TESTNET</Option>
                </Select>
              </Form.Item>
            </Space>

            <Space>
              <Button type="primary" onClick={saveSettings}>
                Lưu
              </Button>
              <Button
                type={isRunning ? 'primary' : 'default'}
                danger={isRunning}
                onClick={isRunning ? onStop : onStart}
                block
                icon={isRunning ? <StopOutlined /> : <PlayCircleOutlined />}
              >
                {isRunning ? 'Dừng lại' : 'Bắt đầu'}
              </Button>
              <Radio.Group
                value={runMode}
                onChange={(e) => {
                  setRunMode(e.target.value);
                  runModeRef.current = e.target.value;
                }}
              >
                <Radio value="sequential">Chạy tuần tự</Radio>
                <Radio value="concurrent">Chạy đồng thời</Radio>
              </Radio.Group>
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card
            title={
              <Space>
                <Button
                  type="text"
                  icon={<CopyOutlined />}
                  onClick={() => {
                    const logText = logs.map((log) => log.message).join('\n');
                    navigator.clipboard.writeText(logText);
                    message.success('Đã sao chép logs');
                  }}
                  style={{ marginLeft: 'auto' }}
                >
                  Sao chép
                </Button>
                <Button type="text" danger icon={<DeleteOutlined />} onClick={handleClearLogs}>
                  Xóa
                </Button>
                {isRunning && countdown > 0 && <>Đang chờ {countdown} giây</>}
                {isRunning && (
                  <Tag color="processing">
                    Chế độ: {runMode === 'concurrent' ? 'Đồng thời' : 'Tuần tự'}
                  </Tag>
                )}
              </Space>
            }
            style={{ marginBottom: '10px' }}
          >
            <div
              style={{
                overflowY: 'auto',
                backgroundColor: '#f5f5f5',
                height: '65px',
                ...scrollbarStyle
              }}
            >
              {logs.length === 0 ? (
                <Text type="secondary">Chưa có log</Text>
              ) : (
                logs.map((log, index) => (
                  <div key={index} style={{ marginBottom: '8px', fontSize: '12px' }}>
                    {log.message}
                  </div>
                ))
              )}
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={24}>
          <Card style={{ marginBottom: '20px' }}>
            <Form layout="vertical">
              <Form.Item>
                <Space style={{ marginBottom: '16px', width: '100%' }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={showModal}>
                    Thêm ví
                  </Button>
                  <Button type="default" icon={<EditOutlined />} onClick={handleResetAllAccounts}>
                    Reset trạng thái
                  </Button>

                  <Button
                    type="default"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleDeleteAllAccounts}
                  >
                    Xóa tất cả
                  </Button>

                  <Button type="default" icon={<DownloadOutlined />} onClick={exportAccounts}>
                    Xuất danh sách
                  </Button>

                  <Upload beforeUpload={importAccounts} showUploadList={false} accept=".json">
                    <Button type="default" icon={<UploadOutlined />}>
                      Nhập danh sách
                    </Button>
                  </Upload>

                  <Button
                    type="default"
                    icon={<DollarOutlined />}
                    onClick={updateAllAccountsBalance}
                  >
                    Cập nhật Balance
                  </Button>
                </Space>

                {/* Hàng chứa cả nút mua và bán, phân cách bởi space-between */}
                <div style={{ marginBottom: '16px' }}>
                  <div
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}
                  >
                    {/* Nhóm các nút MUA */}
                    <Space>
                      <Radio.Group
                        value={selectedBuyPercent}
                        onChange={(e) => {
                          setSelectedBuyPercent(e.target.value);
                          setSelectedSellPercent('none');
                          if (e.target.value !== 'custom' && e.target.value !== 'none') {
                            const cycles =
                              e.target.value === '75' || e.target.value === '100'
                                ? 1
                                : e.target.value === '50'
                                  ? 2
                                  : 3;
                            updateAllAccountsToBuy(
                              parseInt(e.target.value) as 25 | 50 | 75 | 100,
                              cycles
                            );
                          } else if (e.target.value === 'custom') {
                            showCustomBulkBuyModal();
                          }
                        }}
                        buttonStyle="solid"
                      >
                        <Radio.Button disabled={true} value="none">
                          ‎
                        </Radio.Button>
                        <Radio.Button value="25">Mua 25%</Radio.Button>
                        <Radio.Button value="50">Mua 50%</Radio.Button>
                        <Radio.Button value="75">Mua 75%</Radio.Button>
                        <Radio.Button value="100">Mua 100%</Radio.Button>
                        <Radio.Button
                          value="custom"
                          onClick={(e) => {
                            // Ngăn chặn sự kiện onChange mặc định
                            e.stopPropagation();
                            // Hiển thị modal
                            showCustomBulkBuyModal();
                          }}
                        >
                          Tùy chỉnh mua
                        </Radio.Button>
                      </Radio.Group>
                    </Space>

                    {/* Nhóm các nút BÁN */}
                    <Space>
                      <Radio.Group
                        value={selectedSellPercent}
                        onChange={(e) => {
                          setSelectedSellPercent(e.target.value);
                          setSelectedBuyPercent('none');
                          if (e.target.value !== 'custom' && e.target.value !== 'none') {
                            const cycles =
                              e.target.value === '75' || e.target.value === '100'
                                ? 1
                                : e.target.value === '50'
                                  ? 2
                                  : 3;
                            updateAllAccountsToSell(
                              parseInt(e.target.value) as 25 | 50 | 75 | 100,
                              cycles
                            );
                          } else if (e.target.value === 'custom') {
                            showCustomBulkModal();
                          }
                        }}
                        buttonStyle="solid"
                      >
                        <Radio.Button disabled={true} value="none">
                          ‎
                        </Radio.Button>
                        <Radio.Button
                          value="25"
                          style={{
                            backgroundColor:
                              selectedSellPercent === '25' ? '#ff4d4f' : 'transparent',
                            color: selectedSellPercent === '25' ? 'white' : 'inherit',
                            borderColor: selectedSellPercent === '25' ? '#ff4d4f' : '#d9d9d9'
                          }}
                        >
                          Bán 25%
                        </Radio.Button>
                        <Radio.Button
                          value="50"
                          style={{
                            backgroundColor:
                              selectedSellPercent === '50' ? '#ff4d4f' : 'transparent',
                            color: selectedSellPercent === '50' ? 'white' : 'inherit',
                            borderColor: selectedSellPercent === '50' ? '#ff4d4f' : '#d9d9d9'
                          }}
                        >
                          Bán 50%
                        </Radio.Button>
                        <Radio.Button
                          value="75"
                          style={{
                            backgroundColor:
                              selectedSellPercent === '75' ? '#ff4d4f' : 'transparent',
                            color: selectedSellPercent === '75' ? 'white' : 'inherit',
                            borderColor: selectedSellPercent === '75' ? '#ff4d4f' : '#d9d9d9'
                          }}
                        >
                          Bán 75%
                        </Radio.Button>
                        <Radio.Button
                          value="100"
                          style={{
                            backgroundColor:
                              selectedSellPercent === '100' ? '#ff4d4f' : 'transparent',
                            color: selectedSellPercent === '100' ? 'white' : 'inherit',
                            borderColor: selectedSellPercent === '100' ? '#ff4d4f' : '#d9d9d9'
                          }}
                        >
                          Bán 100%
                        </Radio.Button>
                        <Radio.Button
                          value="custom"
                          style={{
                            backgroundColor:
                              selectedSellPercent === 'custom' ? '#ff4d4f' : 'transparent',
                            color: selectedSellPercent === 'custom' ? 'white' : 'inherit',
                            borderColor: selectedSellPercent === 'custom' ? '#ff4d4f' : '#d9d9d9'
                          }}
                          onClick={(e) => {
                            // Ngăn chặn sự kiện onChange mặc định
                            e.stopPropagation();
                            // Hiển thị modal
                            showCustomBulkModal();
                          }}
                        >
                          Tùy chỉnh bán
                        </Radio.Button>
                      </Radio.Group>
                    </Space>
                  </div>
                </div>

                {isLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Spin size="large" />
                    <div style={{ marginTop: '10px' }}>Đang cập nhật dữ liệu...</div>
                  </div>
                ) : accounts.length === 0 ? (
                  <Text type="secondary">Chưa có ví nào được thêm</Text>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={onDragEnd}
                  >
                    <SortableContext
                      items={sortedAccounts.map((item) => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <Table
                        dataSource={[summaryRow]}
                        columns={summaryColumns}
                        rowKey="id"
                        size="small"
                        pagination={false}
                        showHeader={false}
                        style={{ marginBottom: '8px' }}
                        onRow={() => ({
                          style: {
                            backgroundColor: '#e6e6e6',
                            fontWeight: 'bold'
                          }
                        })}
                      />
                      <Table
                        components={components}
                        rowClassName={() => 'editable-row'}
                        dataSource={sortedAccounts}
                        columns={columns}
                        rowKey="id"
                        size="small"
                        pagination={false}
                        scroll={{ y: 330 }}
                        ref={tableRef}
                        onRow={(record) => {
                          if (record.id === currentAccountId && isRunning) {
                            return {
                              style: {
                                backgroundColor: '#7cb9e8',
                                transition: 'background-color 0.3s',
                                fontWeight: 'bold'
                              }
                            };
                          }
                          return {};
                        }}
                      />
                    </SortableContext>
                  </DndContext>
                )}
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingAccount ? `Chỉnh sửa ví ${editingAccount.address}` : 'Thêm ví mới'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
      >
        <Form
          form={modalForm}
          layout="vertical"
          initialValues={{ type: 'buy', waitFrom: 1, waitTo: 5, unit: 'value' }}
        >
          <Form.Item
            label="Tên ví"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên ví' }]}
          >
            <Input placeholder="Nhập tên ví" />
          </Form.Item>
          {!editingAccount && (
            <Form.Item label="Loại nhập liệu" required>
              <Radio.Group value={inputType} onChange={(e) => setInputType(e.target.value)}>
                <Radio value="recovery">Recovery Phrase</Radio>
                <Radio value="privateKey">Private Key</Radio>
              </Radio.Group>
            </Form.Item>
          )}

          {!editingAccount && inputType === 'recovery' && (
            <Form.Item
              label="Recovery Phrase"
              name="recoveryPhrase"
              rules={[{ required: true, message: 'Vui lòng nhập Recovery Phrase' }]}
            >
              <TextArea
                placeholder="Nhập recovery phrase"
                rows={3}
                style={{
                  resize: 'vertical',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  ...scrollbarStyle
                }}
              />
            </Form.Item>
          )}

          {!editingAccount && inputType === 'privateKey' && (
            <Form.Item
              label="Private Key"
              name="privateKey"
              rules={[{ required: true, message: 'Vui lòng nhập Private Key' }]}
            >
              <Input.Password placeholder="Nhập private key" style={{ fontFamily: 'monospace' }} />
            </Form.Item>
          )}

          <Form.Item
            label="Loại bot"
            name="type"
            rules={[{ required: true, message: 'Vui lòng chọn loại bot' }]}
          >
            <Select placeholder="Chọn loại bot">
              <Option value="buy">Mua</Option>
              <Option value="sell">Bán</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Loại số tiền" name="amountType" initialValue="custom">
            <Radio.Group>
              <Radio.Button value="25">25%</Radio.Button>
              <Radio.Button value="50">50%</Radio.Button>
              <Radio.Button value="75">75%</Radio.Button>
              <Radio.Button value="100">100%</Radio.Button>
              <Radio.Button value="custom">Tùy chỉnh</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            label="Tiền vào"
            name="amountIn"
            rules={[{ required: true, message: 'Vui lòng nhập số BNB mỗi lệnh' }]}
            initialValue={3500012}
          >
            <InputNumber
              placeholder="0.00"
              step={0.01}
              min={0}
              style={{ width: '100%' }}
              precision={6}
              formatter={(value) => {
                if (value === undefined || value === null) return '';
                // Xử lý số thập phân đúng cách
                const parts = value.toString().split('.');
                const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                return parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
              }}
              parser={(value: string | undefined) => {
                if (!value) return 0;
                return parseFloat(value.replace(/\$\s?|(,*)/g, '')) || 0;
              }}
            />
          </Form.Item>

          <Form.Item
            label="Đơn vị"
            name="unit"
            rules={[{ required: true, message: 'Vui lòng chọn đơn vị' }]}
            initialValue="value"
          >
            <Select placeholder="Chọn đơn vị">
              <Option value="value">Giá trị</Option>
              <Option value="percent">Phần trăm</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Số vòng chạy"
            name="cycle"
            tooltip="Nhập 0 để chạy vô hạn"
            initialValue={0}
          >
            <InputNumber placeholder="0 (Vô hạn)" min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Thêm modal tùy chỉnh số tiền bán hàng loạt */}
      <Modal
        title="Cập nhật tiền vào tùy chỉnh"
        open={isCustomBulkModalVisible}
        onOk={handleCustomBulkOk}
        onCancel={handleCustomBulkCancel}
        width={400}
      >
        <Form layout="vertical">
          <Form.Item label="Số tiền tùy chỉnh" required>
            <InputNumber
              value={bulkCustomAmount}
              onChange={(value) => setBulkCustomAmount(value ? value.toString() : '')}
              style={{ width: '100%' }}
              placeholder="Nhập số tiền tùy chỉnh"
              formatter={(value) => {
                if (value === undefined || value === null) return '';
                const parts = value.toString().split('.');
                const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                return parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
              }}
              parser={(value) => {
                if (!value) return '';
                return value.replace(/\$\s?|(,*)/g, '');
              }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Thêm modal tùy chỉnh số tiền mua hàng loạt */}
      <Modal
        title="Cập nhật tiền vào tùy chỉnh (MUA)"
        open={isCustomBulkBuyModalVisible}
        onOk={handleCustomBulkBuyOk}
        onCancel={handleCustomBulkBuyCancel}
        width={400}
      >
        <Form layout="vertical">
          <Form.Item label="Số tiền tùy chỉnh" required>
            <InputNumber
              value={bulkCustomBuyAmount}
              onChange={(value) => setBulkCustomBuyAmount(value ? value.toString() : '')}
              style={{ width: '100%' }}
              placeholder="Nhập số tiền tùy chỉnh"
              formatter={(value) => {
                if (value === undefined || value === null) return '';
                const parts = value.toString().split('.');
                const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                return parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
              }}
              parser={(value) => {
                if (!value) return '';
                return value.replace(/\$\s?|(,*)/g, '');
              }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BotControl;
