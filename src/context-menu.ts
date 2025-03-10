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

import {
  Command,
  GraphComponent,
  GraphInputMode,
  IModelItem,
  INode,
  PopulateItemContextMenuEventArgs,
  Rect,
} from '@yfiles/yfiles'
import './context-menu.css'

export function initializeContextMenu(graphComponent: GraphComponent): void {
  const inputMode = graphComponent.inputMode as GraphInputMode

  // Add an event listener that populates the context menu according to the hit elements, or cancels showing a menu.
  inputMode.addEventListener(
    'populate-item-context-menu',
    (evt: PopulateItemContextMenuEventArgs<IModelItem>) =>
      populateContextMenu(graphComponent, evt)
  )
}

/**
 * Populates the context menu based on the item the mouse hovers over.
 * @param graphComponent The given graphComponent
 * @param args The event args.
 */
function populateContextMenu(
  graphComponent: GraphComponent,
  args: PopulateItemContextMenuEventArgs<IModelItem>
): void {
  if (args.handled) {
    return
  }

  const node = args.item instanceof INode ? args.item : null
  // If the cursor is over a node select it
  updateSelection(graphComponent, node)

  // Create the context menu items
  const selectedNodes = graphComponent.selection.nodes
  if (selectedNodes.size > 0) {
    args.contextMenu = [
      {
        label: 'Zoom to node',
        action: async () => {
          let targetRect = selectedNodes.at(0)!.layout.toRect()
          selectedNodes.forEach((node) => {
            targetRect = Rect.add(targetRect, node.layout.toRect())
          })
          await graphComponent.zoomToAnimated(targetRect.getEnlarged(100))
        },
      },
    ]
  } else {
    // no node has been hit
    args.contextMenu = [
      {
        label: 'Fit Graph Bounds',
        action: () =>
          void graphComponent.executeCommand(Command.FIT_GRAPH_BOUNDS),
      },
    ]
  }
}

/**
 * Helper function that updates the node selection state when the context menu is opened on a node.
 * @param graphComponent The given graphComponent
 * @param node The node or `null`.
 */
function updateSelection(
  graphComponent: GraphComponent,
  node: INode | null
): void {
  if (node === null) {
    // clear the whole selection
    graphComponent.selection.clear()
  } else if (!graphComponent.selection.nodes.includes(node)) {
    // no - clear the remaining selection
    graphComponent.selection.clear()
    // and select the node
    graphComponent.selection.nodes.add(node)
    // also update the current item
    graphComponent.currentItem = node
  }
}
