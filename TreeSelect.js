import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Tree, Input, Button, message, Modal } from 'antd';
import emitter from '@/components/Events';
import { useModel } from 'umi';
import {
  PlusOutlined,
  EditOutlined,
  MinusOutlined,
  CheckOutlined,
  DeleteOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import styles from './index.less';

const { Search } = Input;
const { TreeNode } = Tree;

const TreeSelect = (props, propsRef) => {
  const {
    dataTree: dataTreeModel,
    save,
    customReportDetailEntity: { refCateIndexList: editRefCateIndexList = [] } = [],
  } = useModel('commonModel');

  // 编辑时初始化数据
  const { changeIsLeaf, pathname } = props;
  const updateDataTree = [];
  const childMapEdit = (child) => {
    const newChild = [];
    (child || []).forEach((item) => {
      newChild.push({
        name: item.categoryName,
        value: item.categoryName,
        isEditable: false,
        isLeaf: item.refType === 'Index',
        parentKey: 1,
        key: item.appIndexId ? `${item.appIndexId}  ` : `${Math.random(100)}-${Math.random(100)}`,
        showTitle: item.showTitle,
        chartsList: item.chartsList || [],
        children: childMapEdit(item.child),
      });
    });
    return newChild;
  };
  editRefCateIndexList.forEach((item) => {
    updateDataTree.push({
      name: item.categoryName,
      value: item.categoryName,
      isEditable: false,
      isLeaf: item.refType === 'Index',
      parentKey: 1,
      key: item.appIndexId ? `${item.appIndexId}` : `${Math.random(100)}-${Math.random(100)}`,
      showTitle: item.showTitle,
      chartsList: item.chartsList || [],
      children: childMapEdit(item.child),
    });
  });

  const [dataTree, setDataTree] = useState(pathname.includes('update') ? updateDataTree : []);
  const [classifyName, setClassifyName] = useState('');
  const [addVisible, setAddVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [refCateIndexList, setRefCateIndexList] = useState([]);
  const [deleteKey, setDeleteKey] = useState('');
  const [selectKey, setSelectKey] = useState('');

  // 组件通信 增加数据
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const getData = (data) => {
    dataTree.unshift({
      name: data.title,
      key: data.key,
      isLeaf: true,
      allowDrop: false,
      parentKey: `0-${data.key}`,
      isEditable: false,
      chartsList: [
        {
          reportType: 'indexTimeTrend',
          type: 'Column',
          dateRange: 5,
          orderBy: '',
        },
      ],
      showTitle: true,
    });
    setDataTree([...dataTree]);
    save({
      dataTree,
    });
  };

  useEffect(() => {
    save({
      dataTree,
    });
  }, []);

  useEffect(() => {
    emitter.addListener('getData', getData);
    emitter.addListener('submit', handleSubmit);
    emitter.addListener('saveConfig', saveConfig);
    return () => {
      emitter.removeListener('getData', getData);
      emitter.removeListener('submit', handleSubmit);
      emitter.removeListener('saveConfig', saveConfig);
    };
  }, [getData, handleSubmit, saveConfig]);

  // 保存指标配置
  const saveConfig = useCallback(
    (key, showTitle, chartsList) => {
      saveConfigNode(key, showTitle, chartsList, dataTree);
      save({
        dataTree,
      });
      setDataTree([...dataTree]);
    },
    [dataTree, saveConfigNode],
  );

  const saveConfigNode = useCallback((key, showTitle, chartsList, data) => {
    if (chartsList.length === 0) {
      message.info('请选择配置指标！');
      return;
    }
    data.map((item) => {
      if (item.key === key) {
        item.showTitle = showTitle;
        item.chartsList = chartsList;
      }
      if (item.children) {
        saveConfigNode(key, showTitle, chartsList, item.children);
      }
    });
    message.success('保存成功！');
  }, []);

  useImperativeHandle(propsRef, () => ({
    refCateIndexList,
  }));

  // 提交数据处理
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleSubmit = () => {
    const newRefCateIndexList = [];
    const childMap = (child) => {
      const newChild = [];
      child.forEach((item) => {
        newChild.push({
          categoryName: item.name,
          appIndexId: item.isLeaf ? item.key : null,
          refType: item.isLeaf ? 'Index' : 'Category',
          child: item.children ? childMap(item.children) : null,
          showTitle: item.showTitle,
          chartsList: item.chartsList || [],
          isLeaf: item.isLeaf,
        });
      });
      return newChild;
    };
    dataTree.forEach((item) => {
      newRefCateIndexList.push({
        categoryName: item.name,
        appIndexId: item.isLeaf ? item.key : null,
        refType: item.isLeaf ? 'Index' : 'Category',
        showTitle: item.showTitle,
        chartsList: item.chartsList || [],
        child: item.children ? childMap(item.children) : null,
        isLeaf: item.isLeaf,
      });
    });
    setRefCateIndexList(newRefCateIndexList);
  };

  const onEdit = (key) => {
    editNode(key, dataTree);
    save({
      dataTree,
    });
    setDataTree([...dataTree]);
  };

  const editNode = (key, data) =>
    data.map((item) => {
      if (item.key === key) {
        item.isEditable = true;
      } else {
        item.isEditable = false;
      }
      // 当某节点处于编辑状态，并改变数据，点击编辑其他节点时，此节点变成不可编辑状态，value 需要回退到 defaultvalue
      item.value = item.defaultValue;
      if (item.children) {
        editNode(key, item.children);
      }
    });

  const onDelete = (key) => {
    deleteNode(key, dataTree);
    setDeleteKey(key);
    save({
      dataTree,
    });
    save({
      dataTree,
    });
    setDataTree([...dataTree]);
  };

  // 删除节点
  const deleteNode = (key, data, isAllDelete) =>
    data.map((item, index) => {
      if (item.key === key) {
        // 删除指标节点或者全部删除
        if (item.isLeaf || isAllDelete) {
          // 删除指标和分类
          data.splice(index, 1);
          setDeleteVisible(false);
        } else if (item.isLeaf) {
          // 如果含有指标节点
          setDeleteVisible(true);
        } else if (item.children && item.children.length !== 0) {
          // 判断是否含有指标节点
          haveLeafNode(item.children, data, index);
        } else {
          data.splice(index, 1);
        }
      } else if (item.children) {
        deleteNode(key, item.children);
      }
    });

  // 判断是否含有指标节点
  const haveLeafNode = (data, initData, index) => {
    data.map((item) => {
      if (item.isLeaf) {
        setDeleteVisible(true);
      } else if (item.children) {
        haveLeafNode(item.children, initData, index);
      } else {
        initData.splice(index, 1);
      }
    });
  };

  // 删除指标和分类
  const allDelete = () => {
    deleteNode(deleteKey, dataTree, true);
  };

  // 移出指标并删除分类
  const deleteClassFiyAndRemove = () => {
    deleteClassFiyAndRemoveFunction(deleteKey, dataTree);
  };

  // 移出指标处理
  const deleteClassFiyAndRemoveFunction = (key, data) => {
    data.map((item, index) => {
      if (item.key === key) {
        data.splice(index, 1);
        if (item.isLeaf) {
          dataTree.unshift(item);
          save({
            dataTree,
          });
          setDataTree([...dataTree]);
        } else if (item.children) {
          removeNode(item.children);
        }
      } else if (item.children) {
        deleteClassFiyAndRemoveFunction(key, item.children);
      }
    });
    setDeleteVisible(false);
  };

  // 移出指标
  const removeNode = (data) => {
    data.map((item) => {
      if (item.isLeaf) {
        dataTree.unshift(item);
        save({
          dataTree,
        });
        setDataTree([...dataTree]);
      } else if (item.children) {
        removeNode(item.children);
      }
    });
  };

  // -----

  const onChange = (e, key) => {
    changeNode(key, e.target.value, dataTree);
    save({
      dataTree,
    });
    setDataTree([...dataTree]);
  };

  const changeNode = (key, value, data) =>
    data.map((item) => {
      if (item.key === key) {
        item.value = value;
      }
      if (item.children) {
        changeNode(key, value, item.children);
      }
    });

  const onClose = (key, defaultValue) => {
    closeNode(key, defaultValue, dataTree);
    save({
      dataTree,
    });
    setDataTree([...dataTree]);
  };

  const closeNode = (key, defaultValue, data) =>
    data.map((item, index) => {
      item.isEditable = false;
      if (item.key === key) {
        if (isEmptyInput(item.name)) {
          data.splice(index, 1);
        } else {
          item.defaultValue = item.value;
        }
      }
      if (item.children) {
        closeNode(key, defaultValue, item.children);
      }
    });

  const onSave = (key) => {
    saveNode(key, dataTree);
    setDataTree([...dataTree]);
  };

  const saveNode = (key, data) =>
    data.map((item) => {
      if (item.key === key) {
        if (isEmptyInput(item.value)) {
          message.info('请输入分类名称');
          return;
        }
        item.defaultValue = item.value;
        item.name = item.value;
      }
      if (item.children) {
        saveNode(key, item.children);
      }
      item.isEditable = false;
    });

  let expandedKeysList = [];
  const onExpand = (keys) => {
    expandedKeysList = keys;
    setExpandedKeys(keys);
    setAutoExpandParent(false);
  };

  const onAdd = (key) => {
    if (expandedKeys.indexOf(key) === -1 || expandedKeysList.length === 0) {
      expandedKeysList.push(key);
    }
    addNode(key, dataTree);
    setAutoExpandParent(true);
    setExpandedKeys(expandedKeysList);
    save({
      dataTree,
    });
    setDataTree([...dataTree]);
  };

  const handleClassifyName = useCallback((e) => {
    setClassifyName(e.target.value);
  }, []);

  const isEmptyInput = (value) => {
    return value.replace(/(^\s*)|(\s*$)/g, '').replace(/[\r\n]/g, '') === '';
  };

  // 增加
  const sureAddClassifyName = useCallback(
    (e) => {
      if (isEmptyInput(classifyName)) {
        message.info('请输入分类名称');
        return;
      }
      e.preventDefault();
      dataTree.push({
        isClassFiy: true,
        name: classifyName,
        value: classifyName,
        defaultValue: classifyName,
        key: `${Math.random(100)}+${Math.random(100)}`,
        parentKey: 1,
        isEditable: false,
      });
      setDataTree([...dataTree]);
      save({
        dataTree,
      });
      setAddVisible(false);
    },
    [classifyName, dataTree],
  );

  const addNode = (key, data) =>
    data.map((item) => {
      if (item.key === key) {
        if (item.children) {
          item.children.push({
            value: '',
            defaultValue: '',
            name: '',
            key: key + Math.random(100), // 这个 key 应该是唯一的。 Tip: The key should be unique
            parentKey: key,
            isEditable: true,
          });
        } else {
          item.children = [];
          item.children.push({
            value: '',
            defaultValue: '',
            name: '',
            key: key + Math.random(100),
            parentKey: key,
            isEditable: true,
          });
        }
        return;
      }
      if (item.children) {
        addNode(key, item.children);
      }
    });

  const renderTreeNodes = (data) =>
    data.map((item) => {
      // 编辑状态
      if (item.isEditable) {
        item.title = (
          <div>
            <Input
              className={styles.inputField}
              defaultValue={item.name}
              placeholder="请输入分类名称"
              onChange={(e) => onChange(e, item.key)}
            />
            <MinusOutlined
              type="close"
              style={{ marginLeft: 20 }}
              onClick={() => onClose(item.key, item.defaultValue)}
            />
            <CheckOutlined
              type="check"
              style={{ marginLeft: 10 }}
              onClick={() => onSave(item.key)}
            />
          </div>
        );
      } else if (item.isLeaf) {
        // 指标节点
        item.title = (
          <div
            className={styles[item.key === selectKey ? 'selectColor' : '']}
            style={{ display: 'flex', justifyContent: 'space-between' }}
          >
            <div>{item.name} </div>
            <div>
              <span style={{ cursor: 'pointer' }} onClick={() => onDelete(item.key)}>
                <MinusCircleOutlined />
              </span>
            </div>
          </div>
        );
      } else {
        // 文件夹非编辑状态
        item.title = (
          <div className={styles.titleContainer}>
            <span>{item.name}</span>
            <span className={styles.operationField}>
              <EditOutlined
                style={{ marginLeft: 20 }}
                type="edit"
                onClick={() => onEdit(item.key)}
              />
              <PlusOutlined style={{ marginLeft: 10 }} type="add" onClick={() => onAdd(item.key)} />
              {item.parentKey === '0' ? null : (
                <DeleteOutlined
                  style={{ marginLeft: 10 }}
                  type="edit"
                  onClick={() => onDelete(item.key)}
                />
              )}
            </span>
          </div>
        );
      }
      if (item.children) {
        return (
          <TreeNode title={item.title} key={item.key} dataRef={item}>
            {renderTreeNodes(item.children)}
          </TreeNode>
        );
      }
      return <TreeNode {...item} />;
    });

  // 选择节点
  const onSelect = (selectedKeys, info) => {
    const isLeafNode = !!info.node.isLeaf || !!info.node.dataRef?.isLeaf;
    // 给配置提供是否为指标节点&&key值
    changeIsLeaf(isLeafNode, selectedKeys[0]);
    setSelectKey(isLeafNode ? selectedKeys[0] : '');

    let newList = [];
    let newTitle = '';
    if (info.node.dataRef && pathname.includes('update')) {
      newList = info.node.dataRef.chartsList;
      newTitle = info.node.dataRef.showTitle;
      save({
        selectNodeChartList: info.node.dataRef.chartsList,
        showTitle: info.node.dataRef.showTitle,
      });
    } else {
      newList = info.node.chartsList;
      newTitle = true;
      save({
        selectNodeChartList: info.node.chartsList,
        showTitle: true,
      });
    }
    emitter.emit('changeRender', newList, newTitle);
  };

  // ---------------------------
  const onDragEnter = (info) => {
    // expandedKeys 需要受控时设置
    setExpandedKeys(info.expandedKeys);
  };

  const onDrop = (info) => {
    const dropKey = info.node.key;
    const dragKey = info.dragNode.key;
    setExpandedKeys([dropKey]);

    const dropPos = [info.node.pos.split('-')];
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);
    if (info.node.dataRef?.isLeaf || info.node.isLeaf) {
      message.info('不支持该操作！');
      return;
    }
    const loop = (data, key, callback) => {
      for (let i = 0; i < data.length; i++) {
        if (data[i].key === key) {
          return callback(data[i], i, data);
        }
        if (data[i].children) {
          loop(data[i].children, key, callback);
        }
      }
    };
    const data = [...dataTree];

    // Find dragObject
    let dragObj;
    loop(data, dragKey, (item, index, arr) => {
      arr.splice(index, 1);
      dragObj = item;
    });

    if (!info.dropToGap) {
      // Drop on the content
      loop(data, dropKey, (item) => {
        item.children = item.children || [];
        // where to insert 示例添加到头部，可以是随意位置
        item.children.unshift(dragObj);
      });
    } else if (
      (info.node.props.children || []).length > 0 && // Has children
      info.node.props.expanded && // Is expanded
      dropPosition === 1 // On the bottom gap
    ) {
      loop(data, dropKey, (item) => {
        item.children = item.children || [];
        // where to insert 示例添加到头部，可以是随意位置
        item.children.unshift(dragObj);
        // in previous version, we use item.children.push(dragObj) to insert the
        // item to the tail of the children
      });
    } else {
      let ar;
      let i;
      loop(data, dropKey, (item, index, arr) => {
        ar = arr;
        i = index;
      });
      if (dropPosition === -1) {
        ar.splice(i, 0, dragObj);
      } else {
        ar.splice(i + 1, 0, dragObj);
      }
    }
    save({
      dataTree: data,
    });
    setDataTree([...data]);
  };

  const getParentKey = (key, tree) => {
    let parentKey;
    for (let i = 0; i < tree.length; i++) {
      const node = tree[i];
      if (node.children) {
        if (node.children.some((item) => item.key === key)) {
          parentKey = node.key;
        } else if (getParentKey(key, node.children)) {
          parentKey = getParentKey(key, node.children);
        }
      }
    }
    return parentKey;
  };

  const getExpandedKeysNew = (value) => {
    const expandedKeysNew = dataTreeModel
      .map((item) => {
        if (item?.name.indexOf(value) > -1) {
          return getParentKey(item.key, dataTree);
        }
        if (item.children && item.children.length > 0) {
          getExpandedKeysNew(value);
        }
        return null;
      })
      .filter((item, i, self) => item && self.indexOf(item) === i);

    setExpandedKeys(expandedKeysNew);
  };

  const onChangeSearch = (e) => {
    const { value } = e.target;
    // getExpandedKeysNew(value);
    setAutoExpandParent(true);
    let treeArr = [];
    if (dataTreeModel && dataTreeModel.length > 0) {
      treeArr = filterDateTree(value, dataTreeModel, []);
    }
    setDataTree([...treeArr]);
  };

  const filterDateTree = (keyword, data, treeArr) => {
    data.forEach((item) => {
      const { name: title } = item;
      const obj = {
        ...item,
      };
      if (title.indexOf(keyword) > -1) {
        treeArr.push(item);
      } else {
        if (item.children && item.children.length > 0) {
          obj.childrenNew = [];
          filterDateTree(keyword, item.children, obj.childrenNew);
        }
        if (obj.childrenNew && obj.childrenNew.length > 0) {
          treeArr.push(obj);
        }
      }
    });
    return treeArr;
  };

  return (
    <div>
      {console.log('lastData', dataTree)}
      <Search style={{ marginBottom: 8 }} placeholder="请输入指标名称" onChange={onChangeSearch} />
      <div style={{ cursor: 'pointer' }}>
        <div>
          <span
            onClick={() => {
              setAddVisible(true);
            }}
          >
            添加分类 +
          </span>
        </div>
        {addVisible && (
          <div style={{ display: 'flex', marginLeft: 25 }}>
            <Input
              style={{ width: '60%' }}
              placeholder="请输入分类名称"
              onChange={handleClassifyName}
            />{' '}
            <Button
              style={{ marginLeft: 20 }}
              onClick={() => {
                setAddVisible(false);
                setClassifyName('');
              }}
            >
              取消
            </Button>
            <Button style={{ marginLeft: 5 }} onClick={(e) => sureAddClassifyName(e)}>
              确定
            </Button>
          </div>
        )}
      </div>

      {dataTree.length > 0 && (
        <Tree
          className="draggable-tree"
          style={{ marginTop: 10 }}
          expandedKeys={expandedKeys}
          autoExpandParent={autoExpandParent}
          onExpand={onExpand}
          onSelect={onSelect}
          draggable
          blockNode
          onDragEnter={onDragEnter}
          onDrop={onDrop}
        >
          {renderTreeNodes(dataTree)}
        </Tree>
      )}
      <Modal
        visible={deleteVisible}
        onCancel={() => {
          setDeleteVisible(false);
        }}
        footer={
          <div style={{ textAlign: 'center' }}>
            <Button key="back" onClick={() => setDeleteVisible(false)}>
              取消
            </Button>
          </div>
        }
      >
        <div style={{ textAlign: 'center' }}>
          <Button style={{ margin: '10px  0px' }} onClick={deleteClassFiyAndRemove} type="primary">
            移出指标并删除分类
          </Button>{' '}
          <br />
          <Button style={{ margin: '10px  0px', width: 128 }} onClick={allDelete} danger>
            删除指标和分类
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default forwardRef(TreeSelect);
