// @ts-nocheck
import { GraphinContext } from 'antv-graphin-vue';
import { defineComponent, onMounted, onUnmounted, CSSProperties, shallowReactive, watch, ref } from 'vue';

const { useContext, contextSymbol } = GraphinContext

import Menu from './Menu';

interface IG6GraphEvent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}
const defaultStyle: CSSProperties = {
  width: 200,
  background: '#fff',
};

interface ContextMenuProps {
  // children: React.ReactChildren | JSX.Element;
  style?: CSSProperties;
  bindType?: 'node' | 'edge' | 'canvas';
}

interface State {
  /** 当前状态 */
  visible: boolean;
  x: number;
  y: number;
  /** 触发的元素 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item?: IG6GraphEvent['item'];
}

const ContextMenu = defineComponent({
  name: 'ContextMenu',
  props: {
    style: {
      type: Object as ContextMenuProps['style']
    },
    bindType: {
      type: String as ContextMenuProps['bindType']
    }
  },
  inject: [contextSymbol],
  setup(props, { slots }) {
    const { bindType='node', style={} } = props
    const graphin = useContext()
    const { graph } = graphin;
    const state = shallowReactive({
      visible: false,
      x: 0,
      y: 0,
      item: null,
    } as State)

    const containerRef = ref<HTMLDivElement | null>();

    const handleShow = (e: IG6GraphEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('handleShow', e)

      const width: number = graph.get('width');
      const height: number = graph.get('height');

      const bbox = (containerRef.value as HTMLDivElement).getBoundingClientRect();

      const offsetX = graph.get('offsetX') || 0;
      const offsetY = graph.get('offsetY') || 0;

      const graphTop = graph.getContainer().offsetTop;
      const graphLeft = graph.getContainer().offsetLeft;

      let x = e.canvasX + graphLeft + offsetX;
      let y = e.canvasY + graphTop + offsetY;

      // when the menu is (part of) out of the canvas

      if (x + bbox.width > width) {
        x = e.canvasX - bbox.width - offsetX + graphLeft;
      }
      if (y + bbox.height > height) {
        y = e.canvasY - bbox.height - offsetY + graphTop;
      }

      if (bindType === 'node') {
        // 如果是节点，则x，y指定到节点的中心点
        // eslint-disable-next-line no-underscore-dangle
        const { x: PointX, y: PointY } = (e.item && e.item.getModel()) as { x: number; y: number };
        const CenterCanvas = graph.getCanvasByPoint(PointX, PointY);

        const daltX = e.canvasX - CenterCanvas.x;
        const daltY = e.canvasY - CenterCanvas.y;
        x = x - daltX;
        y = y - daltY;
      }

      /** 设置变量 */
      // Object.asign(state, {
      //   visible: true,
      //   x: x,
      //   y: y,
      //   item: e.item,
      // })
      state.visible = true
      state.x = x
      state.y = y
      state.item = e.item
    };
    const handleClose = () => {
      if (state.visible) {
        state.visible = false
        state.x = 0
        state.y = 0
      }
    };
    onMounted(() => {
      // @ts-ignore
      graph.on(`${bindType}:contextmenu`, handleShow);
      graph.on('canvas:click', handleClose);
      graph.on('canvas:drag', handleClose);
      graph.on('wheelzoom', handleClose);
    })
    onUnmounted(() => {
      graph.off(`${bindType}:contextmenu`, handleShow);
      graph.off('canvas:click', handleClose);
      graph.off('canvas:drag', handleClose);
      graph.off('wheelzoom', handleClose);
    })

    watch(() => state, (state) => {
      const { x, y, visible, item } = state;
      /** 将一些方法和数据传递给子组件 */
      graphin.contextmenu = {
        ...graphin.contextmenu,
        [bindType]: {
          handleOpen: handleShow,
          handleClose,
          item,
          visible,
          x,
          y,
          bindType,
        },
      };
      console.log('watch', state, bindType)
    }, { deep: true })

    return () => {

      const { x, y, visible, item } = state;
      const positionStyle: CSSProperties = {
        position: 'absolute',
        left: x + 'px',
        top: y + 'px',
      };
      const id = (item && !item.destroyed && item.getModel && item.getModel().id) || '';

      return (
        <div
          ref={node => containerRef.value = node}
          className="graphin-components-contextmenu"
          // @ts-ignore
          style={{ ...defaultStyle, ...style, ...positionStyle }}
          key={id}
        >
          {visible && slots.default ? slots.default() : null}
        </div>
      );
    }
  }
})

ContextMenu.Menu = Menu;

export default ContextMenu;