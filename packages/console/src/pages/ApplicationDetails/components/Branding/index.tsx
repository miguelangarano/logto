import { generateDarkColor } from '@logto/core-kit';
import {
  Theme,
  defaultPrimaryColor,
  type Application,
  type ApplicationSignInExperience,
  CustomClientMetadataKey,
} from '@logto/schemas';
import { useCallback, useEffect } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import DetailsForm from '@/components/DetailsForm';
import FormCard, { FormCardSkeleton } from '@/components/FormCard';
import ImageInputs, { themeToLogoName } from '@/components/ImageInputs';
import RequestDataError from '@/components/RequestDataError';
import UnsavedChangesAlertModal from '@/components/UnsavedChangesAlertModal';
import { appSpecificBrandingLink, logtoThirdPartyAppBrandingLink } from '@/consts';
import FormField from '@/ds-components/FormField';
import Switch from '@/ds-components/Switch';
import TextInput from '@/ds-components/TextInput';
import useApi from '@/hooks/use-api';
import useDocumentationUrl from '@/hooks/use-documentation-url';
import { emptyBranding } from '@/types/sign-in-experience';
import { trySubmitSafe } from '@/utils/form';
import { uriValidator } from '@/utils/validator';

import NonThirdPartyBrandingForm from './NonThirdPartyBrandingForm';
import useApplicationSignInExperienceSWR from './use-application-sign-in-experience-swr';
import useSignInExperienceSWR from './use-sign-in-experience-swr';
import { type ApplicationSignInExperienceForm, formatFormToSubmitData } from './utils';

type Props = {
  readonly application: Application;
  readonly isActive: boolean; // Support for conditional render UnsavedChangesAlertModal component
  readonly onApplicationUpdated: () => void;
};

function Branding({ application, isActive, onApplicationUpdated }: Props) {
  const { t } = useTranslation(undefined, { keyPrefix: 'admin_console.application_details' });
  const { getDocumentationUrl } = useDocumentationUrl();

  const formMethods = useForm<ApplicationSignInExperienceForm>({
    defaultValues: {
      tenantId: application.tenantId,
      applicationId: application.id,
      isBrandingEnabled: application.isThirdParty,
      branding: emptyBranding,
      color: {},
      registrationDisabled:
        application.customClientMetadata?.[CustomClientMetadataKey.RegistrationDisabled] ?? false,
    },
  });

  const {
    handleSubmit,
    register,
    reset,
    control,
    watch,
    setValue,
    formState: { isDirty, isSubmitting, errors },
  } = formMethods;

  const api = useApi();

  const { data, error, mutate } = useApplicationSignInExperienceSWR(application.id);
  const { data: sieData, error: sieError, mutate: sieMutate } = useSignInExperienceSWR();

  const isApplicationSieLoading = !data && !error;
  const isSieLoading = !sieData && !sieError;
  const isLoading = isApplicationSieLoading || isSieLoading;
  const [isBrandingEnabled, color] = watch(['isBrandingEnabled', 'color']);

  const onSubmit = handleSubmit(
    trySubmitSafe(async (data) => {
      if (isSubmitting) {
        return;
      }

      const { registrationDisabled, isBrandingEnabled } = data;
      const finalRegistrationDisabled = isBrandingEnabled ? registrationDisabled : false;

      await Promise.all([
        api.patch(`api/applications/${application.id}`, {
          json: {
            customClientMetadata: {
              ...application.customClientMetadata,
              [CustomClientMetadataKey.RegistrationDisabled]: finalRegistrationDisabled,
            },
          },
        }),
        api
          .put(`api/applications/${application.id}/sign-in-experience`, {
            json: formatFormToSubmitData(data),
          })
          .json<ApplicationSignInExperience>()
          .then((response) => void mutate(response)),
      ]);

      onApplicationUpdated();
      toast.success(t('general.saved'));
    })
  );

  const onRetryFetch = useCallback(() => {
    void mutate();
    void sieMutate();
  }, [mutate, sieMutate]);

  useEffect(() => {
    if (!data) {
      return;
    }

    reset({
      ...data,
      branding: { ...emptyBranding, ...data.branding },
      isBrandingEnabled: application.isThirdParty
        ? true
        : Object.keys(data.branding).length > 0 ||
          Object.keys(data.color).length > 0 ||
          Boolean(data.customCss),
      registrationDisabled:
        application.customClientMetadata?.[CustomClientMetadataKey.RegistrationDisabled] ?? false,
    });
  }, [application.customClientMetadata, application.isThirdParty, data, reset]);

  // When enabling branding for the first time, fill the default color values to ensure the form
  // is valid; otherwise, directly save the form will be a no-op.
  useEffect(() => {
    if (isBrandingEnabled && Object.values(color).filter(Boolean).length === 0) {
      setValue('color', {
        primaryColor: defaultPrimaryColor,
        darkPrimaryColor: generateDarkColor(defaultPrimaryColor),
      });
    }
  }, [color, isBrandingEnabled, setValue]);

  if (isLoading) {
    return <FormCardSkeleton />;
  }

  if (error && error.status !== 404) {
    return <RequestDataError error={error} onRetry={onRetryFetch} />;
  }

  return (
    <>
      <FormProvider {...formMethods}>
        <DetailsForm
          isDirty={isDirty}
          isSubmitting={isSubmitting}
          onDiscard={reset}
          onSubmit={onSubmit}
        >
          <FormCard
            title="branding.name"
            description={`branding.${
              application.isThirdParty ? 'description_third_party' : 'description'
            }`}
            learnMoreLink={{
              href: getDocumentationUrl(
                application.isThirdParty ? logtoThirdPartyAppBrandingLink : appSpecificBrandingLink
              ),
              targetBlank: 'noopener',
            }}
          >
            {application.isThirdParty && (
              <>
                <FormField title="branding.display_name">
                  <TextInput {...register('displayName')} placeholder={application.name} />
                </FormField>
                <ImageInputs
                  uploadTitle="branding.app_logo"
                  control={control}
                  register={register}
                  fields={Object.values(Theme).map((theme) => ({
                    name: `branding.${themeToLogoName[theme]}`,
                    error: errors.branding?.[themeToLogoName[theme]],
                    type: 'app_logo',
                    theme,
                  }))}
                />
              </>
            )}
            {!application.isThirdParty && (
              <>
                <FormField title="application_details.branding.app_level_sie">
                  <Switch
                    description="application_details.branding.app_level_sie_switch"
                    {...register('isBrandingEnabled')}
                  />
                </FormField>
                {isBrandingEnabled && (
                  <>
                    <Controller
                      control={control}
                      name="registrationDisabled"
                      render={({ field: { onChange, value } }) => (
                        <FormField
                          title={t('branding.disable_user_registration')}
                          description={t('branding.disable_user_registration_description')}
                        >
                          <Switch checked={value} onChange={onChange} />
                        </FormField>
                      )}
                    />
                    <NonThirdPartyBrandingForm />
                  </>
                )}
              </>
            )}
          </FormCard>
          {application.isThirdParty && (
            <FormCard title="branding.more_info" description="branding.more_info_description">
              <FormField title="branding.terms_of_use_url">
                <TextInput
                  {...register('termsOfUseUrl', {
                    validate: (value) =>
                      !value || uriValidator(value) || t('errors.invalid_uri_format'),
                  })}
                  error={errors.termsOfUseUrl?.message}
                  placeholder="https://"
                />
              </FormField>
              <FormField title="branding.privacy_policy_url">
                <TextInput
                  {...register('privacyPolicyUrl', {
                    validate: (value) =>
                      !value || uriValidator(value) || t('errors.invalid_uri_format'),
                  })}
                  error={errors.privacyPolicyUrl?.message}
                  placeholder="https://"
                />
              </FormField>
            </FormCard>
          )}
        </DetailsForm>
      </FormProvider>
      {isActive && <UnsavedChangesAlertModal hasUnsavedChanges={isDirty} onConfirm={reset} />}
    </>
  );
}

export default Branding;
