import categories from 'categories';
import Error from 'components/shared/form/Error';
import Form from 'components/shared/form/Form';
import Input from 'components/shared/form/Input';
import InputWrapper from 'components/shared/form/InputWrapper';
import Label from 'components/shared/form/Label';
import { RadioGroupWrapper } from 'components/shared/form/RadioGroup';
import RadioGroupOption from 'components/shared/form/RadioGroup/Option';
import SelectWrapper from 'components/shared/form/SelectWrapper';
import SubmitButton from 'components/shared/form/SubmitButton';
import { createPost, getTimestamp } from 'lib/firebase';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'react-query';
import useStore from 'store';
import isURL from 'validator/lib/isURL';

const postTypes = [
  {
    label: 'link',
    value: 'link',
  },
  {
    label: 'text',
    value: 'text',
  },
];

export default function CreatePost({ history }) {
  const user = useStore((s) => s.user);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ mode: 'onBlur' });

  const [type, setType] = useState('text');

  const mutation = useMutation(createPost, {
    onSuccess: ({ category, id }) => {
      history.push(`/a/${category}/${id}`);
    },
  });

  function onSubmit(data) {
    const { title, url, text, category } = data;
    if (!user) {
      throw new Error('Login to create post');
    }
    const post = {
      category,
      title,
      type,
      views: 0,
      score: 1,
      created: getTimestamp(),
      votes: {
        [user.uid]: 1,
      },
      upvotePercentage: 100,
      author: {
        uid: user.uid,
        username: user.username,
      },
    };

    if (type === 'text') {
      post.text = text;
    } else {
      post.url = url;
    }

    mutation.mutate(post);
  }

  return (
    <Form onSubmit={handleSubmit(onSubmit)} wide>
      <InputWrapper>
        <RadioGroupWrapper>
          {postTypes.map((option, index) => (
            <RadioGroupOption
              {...option}
              key={index}
              active={option.value === type}
              onClick={() => setType(option.value)}
            />
          ))}
        </RadioGroupWrapper>
      </InputWrapper>
      <InputWrapper>
        <Label>Category</Label>
        <SelectWrapper>
          <Input
            {...register('category', { required: 'Category required' })}
            type="select"
            as="select"
            defaultValue={categories[0]}
          >
            {categories.map((c, index) => (
              <option key={index} value={c}>
                {c}
              </option>
            ))}
          </Input>
        </SelectWrapper>
        <Error> {errors.category?.message} </Error>
      </InputWrapper>
      <InputWrapper>
        <Label> title</Label>
        <Input
          {...register('title', {
            required: 'Title required',
            minLength: {
              value: 5,
              message: 'Atleast 5 characters required',
            },
            maxLength: {
              value: 1000,
              message: 'Cannot exceed 100 characters',
            },
          })}
          type="text"
          placeholder="title"
        />
        <Error> {errors.title?.message}</Error>
      </InputWrapper>
      {type === 'link' && (
        <InputWrapper>
          <Label>url</Label>
          <Input
            {...register('url', {
              validate: (value) => {
                return isURL(value) || 'Provide a valid URL';
              },
            })}
            placeholder="url"
          />
          <Error> {errors.url?.message}</Error>
        </InputWrapper>
      )}
      {type === 'text' && (
        <InputWrapper>
          <Label>text</Label>
          <Input
            {...register('text', {
              minLength: {
                value: 5,
                message: 'Text must have atleats 5 characters',
              },
              maxLength: {
                value: 10000,
                message: 'Text must be under 10,000 characters',
              },
            })}
            placeholder="text"
            as="textarea"
            rows="6"
          />
          <Error> {errors.text?.message}</Error>
        </InputWrapper>
      )}
      <SubmitButton type="submit">create post</SubmitButton>
    </Form>
  );
}
