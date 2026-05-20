import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';
import Nested2 from './Nested2.svelte';

export default function Main($$renderer, $$props) {
	let visible = true;
	let state = 'Foo';
	let slotProps = { slotProps: 'Foo' };
	let props = $$props['props'];

	function show() {
		visible = true;
	}

	function hide() {
		visible = false;
		state = 'Bar';
		slotProps = { slotProps: 'Bar' };
	}

	$$renderer.push(`<div>outside ${$.escape(state)} ${$.escape(props)} ${$.escape(slotProps.slotProps)}</div> `);

	Nested($$renderer, {
		visible,
		slotProps,
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$renderer, { slotProps }) => {
				$$renderer.push(`<!---->inside ${$.escape(state)} ${$.escape(props)} ${$.escape(slotProps)}`);
			}
		}
	});

	$$renderer.push(`<!----> `);

	Nested2($$renderer, {
		visible,
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$renderer, { slotProps }) => {
				$$renderer.push(`<!---->inside ${$.escape(state)} ${$.escape(props)} ${$.escape(slotProps)}`);
			}
		}
	});

	$$renderer.push(`<!---->`);
	$.bind_props($$props, { props, show, hide });
}