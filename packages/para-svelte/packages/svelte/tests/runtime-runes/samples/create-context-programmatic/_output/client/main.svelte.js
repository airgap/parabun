import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import { createContext, mount } from 'svelte';
import Child from './Child.svelte';
import * as $ from 'svelte/internal/client';

const [get, set] = createContext();

export { get };

function Wrapper(Component) {
	return (...args) => {
		set('hello');

		return Component(...args);
	};
}

var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	var div = root();

	$.attach(div, () => (target) => {
		mount(Wrapper(Child), { target });
	});

	$.append($$anchor, div);
	$.pop();
}