import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>action</button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const obj = {
		deep: {
			foo: 'bar',
			action(element, { leet }) {
				element.foo = this.foo + leet;
			}
		}
	};

	$.init();

	var button = root();

	$.action(button, ($$node, $$action_arg) => obj.deep.action?.($$node, $$action_arg), () => ({ leet: 1337 }));
	$.append($$anchor, button);
	$.pop();
}