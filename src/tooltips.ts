/**
 * @license
 * This app exhibits yFiles for HTML functionalities.
 * Copyright (c) 2025 by yWorks GmbH, Vor dem Kreuzberg 28,
 * 72070 Tuebingen, Germany. All rights reserved.
 *
 * yFiles demo files exhibit yFiles for HTML functionalities.
 * Any redistribution of demo files in source code or binary form, with
 * or without modification, is not permitted.
 *
 * Owners of a valid software license for a yFiles for HTML
 * version are allowed to use the app source code as basis for their
 * own yFiles for HTML powered applications. Use of such programs is
 * governed by the rights and conditions as set out in the yFiles for HTML
 * license agreement. If in doubt, please mail to contact@yworks.com.
 *
 * THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN
 * NO EVENT SHALL yWorks BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import './tooltips.css'
import {
  GraphComponent,
  GraphEditorInputMode,
  GraphItemTypes,
  GraphInputMode,
  IModelItem,
  Point,
  QueryItemToolTipEventArgs,
  TimeSpan,
  INode,
  IEdge,
} from '@yfiles/yfiles'

/**
 * Dynamic tooltips are implemented by adding a tooltip provider as an event handler for the 'query-item-tool-tip'
 * event of the {@link GraphEditorInputMode} using the {@link QueryItemToolTipEventArgs} parameter.
 * The {@link QueryItemToolTipEventArgs} parameter provides three relevant properties:
 * handled, queryLocation, and toolTip. The {@link QueryItemToolTipEventArgs.handled} property is a flag which indicates
 * whether the tooltip was already set by one of possibly several tooltip providers. The
 * {@link QueryItemToolTipEventArgs.queryLocation} property contains the mouse position for the query in world coordinates.
 * The {@link QueryItemToolTipEventArgs.toolTip} is set by setting the ToolTip property.
 */
export function initializeTooltips(graphComponent: GraphComponent): void {
  const inputMode = graphComponent.inputMode as GraphInputMode

  // show tooltips only for nodes and edges
  inputMode.toolTipItems = GraphItemTypes.NODE | GraphItemTypes.EDGE

  // Customize the tooltip's behavior to our liking.
  const mouseHoverInputMode = inputMode.toolTipInputMode
  mouseHoverInputMode.toolTipLocationOffset = new Point(15, 15)
  mouseHoverInputMode.delay = TimeSpan.fromMilliseconds(500)
  mouseHoverInputMode.duration = TimeSpan.fromSeconds(5)

  // Register a listener for when a tooltip should be shown.
  inputMode.addEventListener(
    'query-item-tool-tip',
    (args: QueryItemToolTipEventArgs<IModelItem>) => {
      if (args.handled) {
        // Tooltip content has already been assigned -> nothing to do.
        return
      }

      // Use a rich HTML element as tooltip content. Alternatively, a plain string would do as well.
      args.toolTip = createTooltipContent(args.item!, graphComponent)

      // Indicate that the tooltip content has been set.
      args.handled = true
    }
  )
}

/**
 * The tooltip may either be a plain string or it can also be a rich HTML element.
 * In this case, we use a simple HTML div.
 */
function createTooltipContent(
  item: IModelItem,
  graphComponent: GraphComponent
): HTMLElement {
  let tooltip = ''
  // there should be only nodes and edges due to inputMode.tooltipItems
  if (item instanceof INode) {
    tooltip = `Node #${graphComponent.graph.nodes.indexOf(item) + 1}`
  } else if (item instanceof IEdge) {
    tooltip = `Edge #${graphComponent.graph.edges.indexOf(item) + 1}`
  }

  // build the tooltip container
  const tooltipContainer = document.createElement('div')
  tooltipContainer.className = 'tooltip'
  tooltipContainer.innerText = tooltip
  return tooltipContainer
}
