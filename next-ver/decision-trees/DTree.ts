import { IDNode, IDNodeData } from '../types/types';

export class DTree {
    private parentNode: DNode;
    private nodeCounter: number;

    constructor() {
        this.nodeCounter = 0;
        this.parentNode = new DecisionNode('root', this.nodeCounter);
        this.parentNode.nodeID = 0;
    }

    insertNode(parentID: number, node: DNode): void {
        this.nodeCounter++;
        node.nodeID = this.nodeCounter;
        this.parentNode.addChild(parentID, node);
    }

    deleteNode(nodeID: number): void {
        if (nodeID === 0) this.parentNode = new DecisionNode('root');
        else {
            this.parentNode.removeChild(nodeID);
        }
    }

    updateNode(nodeID: number, data: object): void {
        this.parentNode.updateChild(nodeID, data);
    }

    switchNodeType(nodeID: number, nodeType: string): void {
        this.parentNode.switchType(nodeID, nodeType);
        this.insertNode(nodeID, new ResultNode(''));
        this.insertNode(nodeID, new ResultNode(''));
    }

    isValidTree(): boolean {
        return this.parentNode.isValidTree();
    }

    getDataTree(): IDNodeData {
        return this.parentNode.getChildrenData();
    }

    getOptimalTree(): IDNodeData {
        return this.parentNode.getOptimalTree();
    }
}

export function getExampleTree(): DTree {
    let tree = new DTree();
    tree.insertNode(0, new RandomNode('Go', -5));
    tree.insertNode(1, new ResultNode('Rain', -20, 0.2));
    tree.insertNode(1, new DecisionNode('Sunny', 20, 0.8));
    tree.insertNode(3, new ResultNode('Have lunch', 5));
    tree.insertNode(3, new ResultNode('Have dinner', 10));
    tree.insertNode(0, new ResultNode('Not go', 0));
    return tree;
}

export function getBigExampleTree(): DTree {
    let tree = new DTree();
    for (let i = 0; i < 5; i++) {
        tree.insertNode(0, new DecisionNode(`Decision ${i}`, 10));
    }
    for (let i = 0; i < 20; i++) {
        const parentID = Math.floor(Math.random() * 5) + 1;
        tree.insertNode(parentID, new ResultNode(`Rand ${i}`, parentID * 20));
    }
    return tree;
}

// https://observablehq.com/@d3/d3-hierarchy?collection=@d3/d3-hierarchy

export class DNode implements IDNode {
    value: number;

    label: string;

    probability: number | undefined;

    children: DNode[];

    nodeID: number;

    isParentRandomNode: boolean;

    constructor(
        label: string,
        value = 0,
        prob: number | undefined = undefined
    ) {
        this.value = value;
        this.label = label;
        this.nodeID = -1;
        this.probability = prob;
        this.children = [];
        this.isParentRandomNode = false;
    }

    getChildren() {
        return this.children;
    }

    setChildren(ch: DNode[]) {
        this.children = ch;
    }

    getValue() {
        return this.value;
    }

    setValue(v: number) {
        this.value = v;
    }

    addChild(parentID: number, n: DNode): boolean {
        if (this.nodeID == parentID) {
            if (this instanceof ResultNode) {
                throw new Error(
                    "You can't add children to result nodes. Convert them to other type instead."
                );
            }

            if (this instanceof RandomNode) {
                n.isParentRandomNode = true;
            }

            this.children.push(n);
            return true;
        }
        let inserted = false;
        this.children.forEach((c) => {
            if (!inserted) {
                inserted = c.addChild(parentID, n);
            }
        });
        return inserted;
    }

    removeChild(nodeID: number): boolean {
        const childIndex = this.children.findIndex((n) => {
            return n.nodeID === nodeID;
        });

        if (childIndex !== -1) {
            this.children[childIndex] = new ResultNode('');
            return true;
        } else {
            let found = false;
            this.children.forEach(
                (n) => (found = found || n.removeChild(nodeID))
            );
            return found;
        }
    }

    updateChild(nodeID: number, data: object): boolean {
        if (this.nodeID === nodeID) {
            Object.assign(this, this, data);
            return true;
        } else {
            let found = false;
            this.children.forEach(
                (n) => (found = found || n.updateChild(nodeID, data))
            );
            return found;
        }
    }

    getOptimalTree(): IDNodeData {
        throw new Error('Not implemented.');
    }

    getChildrenData(): IDNodeData {
        throw new Error('Not implemented.');
    }

    switchType(nodeID: number, nodeType: string): void {
        const childIndex = this.children.findIndex((n) => {
            return n.nodeID === nodeID;
        });

        if (childIndex !== -1) {
            if (!(this.children[childIndex] instanceof ResultNode)) {
                throw new Error(
                    "You can't change the type of nodes other than result nodes!"
                );
            }

            const childID = this.children[childIndex].nodeID;

            if (nodeType === 'DEC') {
                this.children[
                    childIndex
                ] = ResultNode.prototype.convertToDecisionNode.call(
                    this.children[childIndex]
                );
            } else if (nodeType === 'RND') {
                this.children[
                    childIndex
                ] = ResultNode.prototype.convertToRandomNode.call(
                    this.children[childIndex]
                );
            }
        } else {
            this.children.forEach((n) => n.switchType(nodeID, nodeType));
        }
    }

    isValidTree(): boolean {
        if (this instanceof RandomNode) {
            let accProb = 0;
            this.children.forEach((x) => {
                if (!x.probability || x.probability < 0 || x.probability > 1)
                    return false;

                accProb += x.probability;
            });

            if (Math.abs(accProb - 1) > 0.001) return false;
        }
        let valid = true;
        this.children.forEach((n) => (valid = valid && n.isValidTree()));
        return valid;
    }
}

export class DecisionNode extends DNode {
    getChildrenData(): IDNodeData {
        return {
            label: this.label,
            nodeID: this.nodeID,
            value: this.value,
            type: 'DEC',
            isParentRandomNode: this.isParentRandomNode,
            probability: this.probability,
            children: this.children.map((x) => x.getChildrenData()),
        };
    }

    getOptimalTree(): IDNodeData {
        let expectedValue = -Infinity;
        let optimumChild: number[] = [];

        this.children.forEach((child, i) => {
            const childTree = child.getOptimalTree();

            if (expectedValue === childTree.expectedValue) {
                optimumChild.push(i);
            } else if (childTree.value > expectedValue) {
                optimumChild = [i];
                expectedValue = childTree.expectedValue!;
            }
        });

        return {
            label: this.label,
            nodeID: this.nodeID,
            value: this.value,
            type: 'DEC',
            isParentRandomNode: this.isParentRandomNode,
            probability: this.probability,
            expectedValue: expectedValue + this.value,
            children: this.children.map((x, i) => {
                let childData = x.getOptimalTree();
                if (optimumChild.includes(i)) {
                    childData.isBranchGood = true;
                } else {
                    childData.isBranchGood = false;
                }
                return childData;
            }),
        };
    }
}

export class RandomNode extends DNode {
    getChildrenData(): IDNodeData {
        return {
            label: this.label,
            nodeID: this.nodeID,
            value: this.value,
            type: 'RND',
            isParentRandomNode: this.isParentRandomNode,
            probability: this.probability,
            children: this.children.map((x) => x.getChildrenData()),
        };
    }

    getOptimalTree(): IDNodeData {
        let expectedValue = 0;

        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];
            const childValue = child.getOptimalTree();

            if (!child.probability)
                throw new Error(
                    "This shouldn't happen since I've checked it before, so please."
                );

            if (childValue.expectedValue) {
                expectedValue += child.probability * childValue.expectedValue;
            } else {
                throw new Error(
                    'For some reason this expected value is not set.'
                );
            }
        }

        return {
            label: this.label,
            nodeID: this.nodeID,
            value: this.value,
            type: 'RND',
            isParentRandomNode: this.isParentRandomNode,
            probability: this.probability,
            children: this.children.map((x) => x.getOptimalTree()),
            expectedValue: expectedValue + this.value,
        };
    }
}

export class ResultNode extends DNode {
    getChildrenData(): IDNodeData {
        return {
            label: this.label,
            nodeID: this.nodeID,
            value: this.value,
            type: 'RES',
            isParentRandomNode: this.isParentRandomNode,
            probability: this.probability,
            children: [],
        };
    }

    getOptimalTree(): IDNodeData {
        return {
            label: this.label,
            nodeID: this.nodeID,
            value: this.value,
            type: 'RES',
            isParentRandomNode: this.isParentRandomNode,
            probability: this.probability,
            children: [],
            expectedValue: this.value,
        };
    }

    convertToRandomNode(): RandomNode {
        let n = new RandomNode(this.label, this.value, this.probability);
        n.nodeID = this.nodeID;
        return n;
    }

    convertToDecisionNode(): DecisionNode {
        let n = new DecisionNode(this.label, this.value, this.probability);
        n.nodeID = this.nodeID;
        return n;
    }
}
