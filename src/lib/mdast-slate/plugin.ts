import { MdastNode } from './types';
import transform, {
  DeserializeOptions,
  DeserializeContext,
  assignFootnoteDefinitions,
} from './deserialize';

export default function plugin(opts: DeserializeOptions = {}): void {
  const compiler = (node: { children: MdastNode[] }, file) => {
    const context: DeserializeContext = {
      footnoteReferences: {},
      footnoteDefinitions: {},
    };
    file.data = node.children.map((c) => transform(c, opts, context));
    assignFootnoteDefinitions(context);
  };

  this.Compiler = compiler;
}
