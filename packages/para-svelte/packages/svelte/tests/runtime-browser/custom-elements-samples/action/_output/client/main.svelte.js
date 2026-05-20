import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div>action</div>`);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	let name = $.prop($$props, 'name', 12);
	let events = $.prop($$props, 'events', 28, () => []);

	function action(_node, name) {
		events().push(name);

		return {
			update(name) {
				events().push(name);
			},

			destroy() {
				events().push("destroy");
			}
		};
	}

	var $$exports = {
		get name() {
			return name();
		},

		set name($$value) {
			name($$value);
			$.flush();
		},

		get events() {
			return events();
		},

		set events($$value) {
			events($$value);
			$.flush();
		}
	};

	$.init();

	var div = root();

	$.action(div, ($$node, $$action_arg) => action?.($$node, $$action_arg), name);
	$.append($$anchor, div);

	return $.pop($$exports);
}

customElements.define('custom-element', $.create_custom_element(_unknown_, { name: {}, events: {} }, [], [], { mode: 'open' }));