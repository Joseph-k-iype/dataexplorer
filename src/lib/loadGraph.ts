import { Graph, Rect } from '@yfiles/yfiles'

export default async function loadGraph() {
  const graph = new Graph()

  const node1 = graph.createNode(new Rect(100, 100, 75, 50))
  graph.addLabel(node1, 'Node 1')

  const node2 = graph.createNode(new Rect(200, 200, 75, 50))
  graph.addLabel(node2, 'Node 2')

  graph.createEdge(node1, node2)

  return graph
}
